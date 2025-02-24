/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable max-classes-per-file */

import { toRegExp, toRegExpDetails } from 'oniguruma-to-es';
import { monaco } from '@kbn/monaco';

// Will match %{subPattern} or %{subPattern:fieldName}
const SUBPATTERNS_REGEX = /%\{[A-Z0-9_]+(?::[A-Za-z0-9_]+)?(?::[A-Za-z]+)?\}/g;

const NESTED_FIELD_NAMES_REGEX =
  /(\(\?<([A-Za-z0-9_]+)(?::([A-Za-z0-9_]+))?(?::([A-Za-z]+))?>)|\(\?:|\(\?>|\(\?!|\(\?<!|\(|\\\(|\\\)|\)|\[|\\\[|\\\]|\]/g;

// The only supported semantic conversions are int and float. By default all semantics are saved as strings.
// https://www.elastic.co/guide/en/logstash/current/plugins-filters-grok.html#_grok_basics
const SUPPORTED_TYPE_CONVERSIONS = ['int', 'float'];

export class GrokCollection {
  private patterns: Map<string, GrokPattern> = new Map();
  private patternKeys: string[] = [];

  public getPattern(id: string) {
    return this.patterns.get(id);
  }

  public addPattern(id: string, rawPattern: string) {
    if (this.patterns.has(id)) {
      // eslint-disable-next-line no-console
      console.warn('Warning: pattern with ID: %s already exists', id);
    } else {
      const pattern = new GrokPattern(rawPattern, id, this);
      this.patterns.set(id, pattern);

      return pattern;
    }
  }

  public resolvePatterns() {
    this.patterns.forEach((pattern) => {
      if (!pattern.isResolved()) {
        pattern.resolvePattern();
      }
    });
    this.patternKeys = Array.from(this.patterns.keys());
  }

  // Can be used with Monaco code editor to provide suggestions
  public getSuggestionProvider = () => {
    const provider: monaco.languages.CompletionItemProvider = {
      triggerCharacters: ['{'],
      provideCompletionItems: (model, position, context, token) => {
        const wordUntil = model.getWordUntilPosition(position);
        const lineContent = model?.getLineContent(position.lineNumber);
        // A relatively simple implementation: when typing %{ the } will autocomplete, so if the next character is } we will provide suggestions.
        // Could potentially be more robust.
        const nextCharacterIsClosingPatternBracket =
          lineContent?.charAt(position.column - 1) === '}';

        const matchingPatterns = this.patternKeys.filter((key) =>
          key.toLowerCase().startsWith(wordUntil.word.toLowerCase())
        );

        const wordRange = new monaco.Range(
          position.lineNumber,
          wordUntil.startColumn,
          position.lineNumber,
          wordUntil.endColumn
        );

        const suggestions = matchingPatterns.map((key) => {
          return {
            label: key,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: key + (nextCharacterIsClosingPatternBracket ? '' : '}'),
            range: wordRange,
          };
        });

        return {
          suggestions,
        };
      },
    };
    return provider;
  };
}

export class GrokPattern {
  // The raw pattern, this might be a direct Oniguruma expression, or an expression that contains Grok subpatterns.
  // E.g. INT (?:[+-]?(?:[0-9]+)) or MAC (?:%{CISCOMAC}|%{WINDOWSMAC}|%{COMMONMAC})
  private rawPattern: string;
  // Primarily used for mapping capture groups to names / types
  private fields;
  // The resolved pattern is the raw pattern converted to Oniguruma regex. This includes sub patterns and field names being converted.
  private resolvedPattern: string | null = null;
  // The regexp is the Oniguruama regex pattern converted to a JS regular expression.
  // This will be undefined if the pattern hasn't been resolved / regex hasn't been generated. It will be null if the regex generation failed.
  private regexp: RegExp | null | undefined = undefined;
  private parentCollection: GrokCollection;

  constructor(rawPattern: string, id: string, collection: GrokCollection) {
    // These are keyed to match the regex capturing groups keys
    this.fields = new Map();
    this.rawPattern = rawPattern;
    this.parentCollection = collection;
  }

  public isResolved() {
    return this.resolvedPattern !== null;
  }

  public resolvePattern = (forceResolve = false) => {
    if (!forceResolve && this.isResolved()) {
      return this.resolvedPattern;
    }

    this.fields.clear();
    this.resolveSubPatterns();
    this.resolveFieldNames();
    return this.resolvedPattern;
  };

  private resolveSubPatterns = () => {
    let rawPattern = this.rawPattern;
    // E.g. %{WORD:verb}
    const subPatterns = rawPattern.match(SUBPATTERNS_REGEX) || [];

    subPatterns.forEach((matched) => {
      // Matched will either be %{subPatternName} or %{subPatternName:fieldName} or %{subPatternName:fieldName:type}
      // Substring example: INT:mynumber:float
      const withBracketsRemoved = matched.substring(2, matched.length - 1);
      const elements = withBracketsRemoved.split(':');

      // E.g. INT
      const subPatternName = elements[0];

      // E.g. mynumber (optional)
      const fieldName = elements[1];

      // E.g float (optional)
      const fieldType = elements[2];

      const subPattern = this.parentCollection.getPattern(subPatternName);

      if (!subPattern) {
        return;
      }

      if (!subPattern.isResolved()) {
        subPattern.resolvePattern();
      }

      if (fieldName) {
        rawPattern = rawPattern.replace(
          matched,
          '(?<' + fieldName + '>' + subPattern.resolvedPattern! + ')'
        );
        const fieldEntry = {
          name: fieldName,
          type: fieldType && SUPPORTED_TYPE_CONVERSIONS.includes(fieldType) ? fieldType : null,
        };
        this.fields.set(fieldName, fieldEntry);
      } else {
        rawPattern = rawPattern.replace(matched, subPattern.resolvedPattern!);
      }
    });

    this.resolvedPattern = rawPattern;
  };

  // Resolve manual field names in the expression, e.g.: (?<queue_id>[0-9A-F]{10,11})
  private resolveFieldNames = () => {
    if (!this.resolvedPattern) {
      return;
    }

    let nestLevel = 0;
    let inRangeDef = 0;
    let matched;

    while ((matched = NESTED_FIELD_NAMES_REGEX.exec(this.resolvedPattern)) !== null) {
      switch (matched[0]) {
        case '(': {
          if (!inRangeDef) {
            nestLevel = nestLevel + 1;
          }
          break;
        }
        case '\\(':
          break; // can be ignored
        case '\\)':
          break; // can be ignored
        case ')': {
          if (!inRangeDef) {
            nestLevel = nestLevel - 1;
          }
          break;
        }
        case '[': {
          ++inRangeDef;
          break;
        }
        case '\\[':
          break; // can be ignored
        case '\\]':
          break; // can be ignored
        case ']': {
          --inRangeDef;
          break;
        }
        case '(?:': // fallthrough                // group not captured
        case '(?>': // fallthrough                // atomic group
        case '(?!': // fallthrough                // negative look-ahead
        case '(?<!': {
          if (!inRangeDef) {
            nestLevel = nestLevel + 1;
          }
          break;
        } // negative look-behind
        default: {
          nestLevel++;
          // Given (?<queue_id:mything:int> [2] is queue_id, [3] is mything (optional), [4] is int (optional)
          // In our regex capture group keys we'll see something like $0_queue_id_myname_mytype if name and type are used. Otherwise just queue_id for the key.
          const captureGroupKey = matched[3]
            ? `$0_${matched[2]}_${matched[3]}${matched[4] ? `_${matched[4]}` : ''}`
            : matched[2];

          const fieldEntry = this.fields.get(captureGroupKey);

          // This check is so we don't reprocess the field name replacements from resolveSubPatterns
          if (!fieldEntry) {
            this.fields.set(captureGroupKey, {
              name: matched[3] ?? matched[2],
              type:
                matched[4] && SUPPORTED_TYPE_CONVERSIONS.includes(matched[4]) ? matched[4] : null,
            });
          }

          break;
        }
      }
    }
  };

  public parse = (samples: string[], regenerateRegex = false) => {
    if (!this.isResolved()) {
      // eslint-disable-next-line no-console
      console.warn('Pattern must be resolved before it can be parsed');
    }

    if (regenerateRegex || !this.regexp) {
      this.getRegex();
    }

    if (this.regexp) {
      return samples.map((sample) => {
        const results = this.regexp?.exec(sample);
        if (results?.groups) {
          return Object.entries(results.groups).reduce<Record<string, string | number>>(
            (acc, [key, value]) => {
              const field = this.fields.get(key);
              if (!field) return acc;
              if (field && field.type === 'int') {
                acc[field.name] = parseInt(value, 10);
              } else if (field && field.type === 'float') {
                acc[field.name] = parseFloat(value);
              } else {
                acc[field.name] = value;
              }
              return acc;
            },
            {}
          );
        } else {
          return {};
        }
      });
    } else {
      return [];
    }
  };

  public getRegex = () => {
    if (!this.isResolved()) {
      this.resolvePattern();
    }

    try {
      this.regexp = toRegExp(this.resolvedPattern!);
    } catch {
      this.regexp = null;
    }

    return this.regexp;
  };

  public getRegexPattern = () => {
    if (!this.isResolved()) {
      this.resolvePattern();
    }

    try {
      const regexpDetails = toRegExpDetails(this.resolvedPattern!);
      return regexpDetails.pattern;
    } catch {
      return null;
    }
  };

  public updatePattern = (rawPattern: string) => {
    this.rawPattern = rawPattern;
    this.resolvedPattern = null;
    this.regexp = undefined;
  };
}
