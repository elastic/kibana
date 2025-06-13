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
import { v4 as uuidv4 } from 'uuid';
import { unflattenObject } from '@kbn/object-utils';
import { euiPaletteColorBlindBehindText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { escape } from 'lodash';
import { Subject } from 'rxjs';
import { PATTERN_MAP } from '../constants/pattern_map';
import { SupportedTypeConversion, FieldDefinition } from './types';

// Grok patterns use this official naming: %{SYNTAX:SEMANTIC:TYPE}

// Will match %{SYNTAX}, %{SYNTAX:SEMANTIC}, %{SYNTAX:SEMANTIC:TYPE}, and support special characters and dots.
const SUBPATTERNS_REGEX =
  /%\{[A-Z0-9_@#$%&*+=\-\.]+(?::[A-Za-z0-9_@#$%&*+=\-\.]+)?(?::[A-Za-z]+)?\}/g;

// Matches "manual" semantic names in the expression, these are user defined capture groups, e.g. (?<field_name>the pattern here)
const NESTED_FIELD_NAMES_REGEX =
  /(\(\?<([A-Za-z0-9_@#$%&*+=\-\.]+)(?::([A-Za-z0-9_@#$%&*+=\-\.]+))?(?::([A-Za-z]+))?>)|\(\?:|\(\?>|\(\?!|\(\?<!|\(|\\\(|\\\)|\)|\[|\\\[|\\\]|\]/g;

// The only supported semantic conversions are int and float. By default all semantics are saved as strings.
// https://www.elastic.co/guide/en/logstash/current/plugins-filters-grok.html#_grok_basics
const SUPPORTED_TYPE_CONVERSIONS = Object.values(SupportedTypeConversion);

// We supply this suffix to track which capture groups we have generated.
const CAPTURE_GROUP_GENERATED_ID_SUFFIX = '_____GENERATED_CAPTURE_GROUP_____';

const CUSTOM_NAMED_CAPTURE_PATTERN_PREFIX = i18n.translate(
  'kbn.grokUi.customNamedCapturePatternPrefix',
  { defaultMessage: 'Custom named capture ' }
);

export class GrokCollection {
  // Core patterns. Will be used for the lifetime of this collection.
  private patterns: Map<string, GrokPattern> = new Map();
  // Custom patterns that may be expected to change on the fly (via user input in the UI etc).
  private customPatterns: Map<string, GrokPattern> = new Map();
  public readonly customPatternsChanged$ = new Subject<void>();
  // Combination of core and custom patterns.
  private patternKeys: string[] = [];
  // NOTE: This doesn't subscribe to EUI_VIS_COLOR_STORE changes at the moment, whilst UI / UX is being finalised.
  private colourPalette = euiPaletteColorBlindBehindText({ rotations: 3 });
  private colourIndex = 0;

  // NOTE: Model as async for now with future intent to use the /_ingest/processor/grok endpoint
  public async setup() {
    Object.entries(PATTERN_MAP).forEach(([key, value]) => {
      this.addPattern(key, String.raw`${value}`, this.patterns);
    });
    this.resolvePatterns(this.patterns);
  }

  public getPattern(id: string) {
    // Custom patterns take precedence and overwrite core patterns.
    if (this.customPatterns.has(id)) {
      return this.customPatterns.get(id);
    } else if (this.patterns.has(id)) {
      return this.patterns.get(id);
    }
  }

  public addPattern(id: string, rawPattern: string, destination: Map<string, GrokPattern>) {
    if (destination.has(id)) {
      // eslint-disable-next-line no-console
      console.warn('Warning: pattern with ID: %s already exists', id);
    } else {
      const pattern = new GrokPattern(rawPattern, id, this);
      destination.set(id, pattern);

      return pattern;
    }
  }

  public setCustomPatterns(patterns: Record<string, string>) {
    this.customPatterns.clear();
    Object.entries(patterns).forEach(([key, value]) => {
      this.addPattern(key, String.raw`${value}`, this.customPatterns);
    });
    this.resolvePatterns(this.customPatterns);
    this.customPatternsChanged$.next();
  }

  public resolvePatterns(source: Map<string, GrokPattern> = this.patterns) {
    source.forEach((pattern) => {
      if (!pattern.isResolved()) {
        pattern.resolvePattern();
      }
    });
    this.generatePatternKeys();
  }

  private generatePatternKeys = () => {
    this.patternKeys = Array.from(this.patterns.keys()).concat(
      Array.from(this.customPatterns.keys())
    );
  };

  // Only relevant for Monaco users.
  // Can be used with Monaco code editor to provide suggestions.
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

  public getColour = () => {
    // Loop back to 0 once at the end of the rotations
    this.colourIndex = this.colourIndex + 1 <= this.colourPalette.length ? this.colourIndex + 1 : 0;
    return this.colourPalette[this.colourIndex];
  };

  // Only relevant for Monaco users.
  // Monaco doesn't support dynamic inline styles, so we need to generate static styles for the colour palette.
  public getColourPaletteStyles = () => {
    const styles: Record<string, { backgroundColor: string; cursor: string }> = {};
    for (let $i = 0; $i < this.colourPalette.length; $i++) {
      const colour = this.colourPalette[$i];
      const colourWithoutHash = colour.substring(1);
      styles[`.grok-pattern-match-${colourWithoutHash}`] = {
        backgroundColor: colour,
        cursor: 'pointer',
      };
    }
    return styles;
  };

  public resetColourIndex = () => {
    this.colourIndex = 0;
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
    // These are keyed to match the regex capturing groups keys, which will be a randomly generated ID.
    this.fields = new Map<string, FieldDefinition>();
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

    this.parentCollection.resetColourIndex();
    this.fields.clear();
    this.resolveSubPatterns();
    this.resolveFieldNames();
    return this.resolvedPattern;
  };

  private resolveSubPatterns = () => {
    let rawPattern = this.rawPattern;
    const subPatterns = rawPattern.match(SUBPATTERNS_REGEX) || [];

    subPatterns.forEach((matched) => {
      // Matched will either be %{SYNTAX}, %{SYNTAX:SEMANTIC}, or %{SYNTAX:SEMANTIC:TYPE}
      // Removes %{ }
      const withBracketsRemoved = matched.substring(2, matched.length - 1);
      const elements = withBracketsRemoved.split(':');

      // Syntax e.g. INT
      const subPatternName = elements[0];

      // Semantic e.g. mynumber (optional)
      const fieldName = elements[1];

      // Type e.g float (optional)
      const fieldType = elements[2];

      const subPattern = this.parentCollection.getPattern(subPatternName);

      if (!subPattern) {
        return;
      }

      if (!subPattern.isResolved()) {
        subPattern.resolvePattern();
      }

      // Only some patterns will have a semantic / field name, other patterns will be matched but are not captured / part of the structured output.
      // The replacements will take something like ${WORD} and replace it with a resolved Oniguruma pattern, e.g. \b\w+\b
      if (fieldName) {
        // We generate a unique ID for the capture group, this is used to map the capture group to the field metadata.
        // Capture groups, for instance, do not support special characters or dots in the name in JavaScript's regex implementation, but this is allowed in Grok.
        const generatedId = getGeneratedCaptureGroupId();

        // As we want to track this semantic / field result we also prefix with a named capture group.
        rawPattern = rawPattern.replace(
          matched,
          '(?<' + generatedId + '>' + subPattern.resolvedPattern! + ')'
        );
        const fieldEntry = {
          name: fieldName,
          type:
            fieldType && SUPPORTED_TYPE_CONVERSIONS.includes(fieldType as SupportedTypeConversion)
              ? (fieldType as SupportedTypeConversion)
              : null,
          colour: this.parentCollection.getColour(),
          pattern: matched,
        };
        this.fields.set(generatedId, fieldEntry);
      } else {
        // This will form part of the overal pattern and part of the "continuous" match, but the result won't be captured / part of the structured output.
        rawPattern = rawPattern.replace(matched, subPattern.resolvedPattern!);
      }
    });

    this.resolvedPattern = rawPattern;
  };

  // Resolve manual semantic / field names in the expression provided by capture groups, e.g.: (?<queue_id>[0-9A-F]{10,11})
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
          const generatedId = getGeneratedCaptureGroupId();

          // This check is so we don't reprocess the field name replacements from resolveSubPatterns
          if (!matched[2].includes('_____GENERATED_CAPTURE_GROUP_____')) {
            this.fields.set(generatedId, {
              name: matched[3] ?? matched[2],
              type:
                matched[4] &&
                SUPPORTED_TYPE_CONVERSIONS.includes(matched[4] as SupportedTypeConversion)
                  ? (matched[4] as SupportedTypeConversion)
                  : null,
              colour: this.parentCollection.getColour(),
              pattern: `${CUSTOM_NAMED_CAPTURE_PATTERN_PREFIX} ${escape(
                String.raw`${matched[1]}`
              )}`,
            });

            // (?<queue_id:mything:int> becomes (?<GENERATED_ID>
            this.resolvedPattern = this.resolvedPattern.replace(
              matched.input,
              matched.input.replace(matched[2], generatedId)
            );
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
        // Takes our groups, which are keyed by our generated IDs, then we can map these results back to the real metadata we've stored under the fields property.
        // E.g. real names and real types.
        if (results?.groups) {
          return unflattenObject(
            Object.entries(results.groups).reduce<Record<string, string | number>>(
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
            )
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

  public getFields = () => {
    return this.fields;
  };
}

const getGeneratedCaptureGroupId = () => {
  // Named capture groups support underscores, so we replace hyphens with underscores.
  // Named capture groups must start with a string, not a number, so we prefix with a letter. p_ here just stands for prefix.
  return `p_${uuidv4().replaceAll('-', '_')}${CAPTURE_GROUP_GENERATED_ID_SUFFIX}`;
};
