/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { i18n } from '@kbn/i18n';
import type { ESQLFieldWithMetadata } from '@kbn/esql-types';
import type { ESQLColumn, ESQLIdentifier } from '../../../types';
import type { ESQLUserDefinedColumn, ICommandContext } from '../../registry/types';
import { getLastNonWhitespaceChar } from './autocomplete/helpers';
import type { ESQLAstItem } from '../../../types';
import type { SupportedDataType } from '../types';

export const techPreviewLabel = i18n.translate(
  'kbn-esql-language.esql.autocomplete.techPreviewLabel',
  {
    defaultMessage: `Technical Preview`,
  }
);

/**
 * In several cases we don't want to count the last arg if it is
 * of type unknown.
 *
 * this solves for the case where the user has typed a
 * prefix (e.g. "keywordField != tex/")
 *
 * "tex" is not a recognizable identifier so it is of
 * type "unknown" which leads us to continue suggesting
 * fields/functions.
 *
 * Monaco will then filter our suggestions list
 * based on the "tex" prefix which gives the correct UX
 */
export function removeFinalUnknownIdentiferArg(
  args: ESQLAstItem[],
  getExpressionType: (expression: ESQLAstItem) => SupportedDataType | 'unknown'
) {
  return getExpressionType(args[args.length - 1]) === 'unknown'
    ? args.slice(0, args.length - 1)
    : args;
}

/**
 * Checks the suggestion text for overlap with the current query.
 *
 * This is useful to determine the range of the existing query that should be
 * replaced if the suggestion is accepted.
 *
 * For example
 * QUERY: FROM source | WHERE field IS NO
 * SUGGESTION: IS NOT NULL
 *
 * The overlap is "IS NO" and the range to replace is "IS NO" in the query.
 *
 * @param query
 * @param suggestionText
 * @returns
 */
export function getOverlapRange(
  query: string,
  suggestionText: string
): { start: number; end: number } | undefined {
  let overlapLength = 0;

  // Convert both strings to lowercase for case-insensitive comparison
  const lowerQuery = query.toLowerCase();
  const lowerSuggestionText = suggestionText.toLowerCase();

  for (let i = 0; i <= lowerSuggestionText.length; i++) {
    const substr = lowerSuggestionText.substring(0, i);
    if (lowerQuery.endsWith(substr)) {
      overlapLength = i;
    }
  }

  if (overlapLength === 0) {
    return;
  }

  return {
    start: query.length - overlapLength,
    end: query.length,
  };
}

/**
 * Works backward from the cursor position to determine if
 * the final character of the previous word matches the given character.
 */
function characterPrecedesCurrentWord(text: string, char: string) {
  let inCurrentWord = true;
  for (let i = text.length - 1; i >= 0; i--) {
    if (inCurrentWord && /\s/.test(text[i])) {
      inCurrentWord = false;
    }

    if (!inCurrentWord && !/\s/.test(text[i])) {
      return text[i] === char;
    }
  }
}

export function pipePrecedesCurrentWord(text: string) {
  return characterPrecedesCurrentWord(text, '|');
}

export function findPipeOutsideQuotes(text: string, start: number = 0): number {
  let inString = false;
  let stringChar = '';

  for (let i = start; i < text.length; i++) {
    const char = text[i];

    if (inString) {
      if (char === '\\' && i + 1 < text.length) {
        i++;
        continue;
      }

      if (char === stringChar) {
        inString = false;
        stringChar = '';
      }

      continue;
    }

    if (char === '"' || char === "'") {
      inString = true;
      stringChar = char;
      continue;
    }

    if (char === '|') {
      return i;
    }
  }

  return -1;
}

/**
 * Are we after a comma? i.e. STATS fieldA, <here>
 */
export function isRestartingExpression(text: string) {
  return getLastNonWhitespaceChar(text) === ',' || characterPrecedesCurrentWord(text, ',');
}

/**
 * Take a column name like "`my``column`"" and return "my`column"
 */
export function unescapeColumnName(columnName: string) {
  // TODO this doesn't cover all escaping scenarios... the best thing to do would be
  // to use the AST column node parts array, but in some cases the AST node isn't available.
  if (columnName.startsWith('`') && columnName.endsWith('`')) {
    return columnName.slice(1, -1).replace(/``/g, '`');
  }
  return columnName;
}

/**
 * This function returns the userDefinedColumn or field matching a column
 */
export function getColumnByName(
  columnName: string,
  { columns }: ICommandContext
): ESQLFieldWithMetadata | ESQLUserDefinedColumn | undefined {
  const unescaped = unescapeColumnName(columnName);
  return columns.get(unescaped);
}

/**
 * This function returns the userDefinedColumn or field matching a column
 */
export function getColumnForASTNode(
  node: ESQLColumn | ESQLIdentifier,
  { columns }: ICommandContext
): ESQLFieldWithMetadata | ESQLUserDefinedColumn | undefined {
  const formatted = node.type === 'identifier' ? node.name : node.parts.join('.');
  return getColumnByName(formatted, { columns });
}

function hasWildcard(name: string) {
  return /\*/.test(name);
}

function getMatcher(name: string, position: 'start' | 'end' | 'middle' | 'multiple-within') {
  if (position === 'start') {
    const prefix = name.substring(1);
    return (resource: string) => resource.endsWith(prefix);
  }
  if (position === 'end') {
    const prefix = name.substring(0, name.length - 1);
    return (resource: string) => resource.startsWith(prefix);
  }
  if (position === 'multiple-within') {
    // make sure to remove the * at the beginning of the name if present
    const safeName = name.startsWith('*') ? name.slice(1) : name;
    // replace 2 ore more consecutive wildcards with a single one
    const setOfChars = safeName.replace(/\*{2+}/g, '*').split('*');
    return (resource: string) => {
      let index = -1;
      return setOfChars.every((char) => {
        index = resource.indexOf(char, index + 1);
        return index !== -1;
      });
    };
  }
  const [prefix, postFix] = name.split('*');
  return (resource: string) => resource.startsWith(prefix) && resource.endsWith(postFix);
}

function getWildcardPosition(name: string) {
  if (!hasWildcard(name)) {
    return 'none';
  }
  const wildCardCount = name.match(/\*/g)!.length;
  if (wildCardCount > 1) {
    return 'multiple-within';
  }
  if (name.startsWith('*')) {
    return 'start';
  }
  if (name.endsWith('*')) {
    return 'end';
  }
  return 'middle';
}

/**
 * Type guard to check if the type is 'param'
 */
export const isParamExpressionType = (type: string): type is 'param' => type === 'param';

/** Counts commas at the top nesting level, respecting parens/brackets/braces/strings. */
export function countTopLevelCommas(text: string, start: number, end: number): number {
  let commas = 0;
  let parenDepth = 0;
  let bracketDepth = 0;
  let braceDepth = 0;
  let quote: '"' | "'" | undefined;

  for (let i = start; i < end && i < text.length; i++) {
    const char = text[i];

    if (quote) {
      if (char === '\\' && i + 1 < end) {
        i++;
        continue;
      }

      if (char === quote) {
        quote = undefined;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }

    if (char === '(') {
      parenDepth++;
      continue;
    }

    if (char === ')') {
      parenDepth = Math.max(0, parenDepth - 1);
      continue;
    }

    if (char === '[') {
      bracketDepth++;
      continue;
    }

    if (char === ']') {
      bracketDepth = Math.max(0, bracketDepth - 1);
      continue;
    }

    if (char === '{') {
      braceDepth++;
      continue;
    }

    if (char === '}') {
      braceDepth = Math.max(0, braceDepth - 1);
      continue;
    }

    if (char === ',' && parenDepth === 0 && bracketDepth === 0 && braceDepth === 0) {
      commas++;
    }
  }

  return commas;
}

export function fuzzySearch(fuzzyName: string, resources: IterableIterator<string>) {
  const wildCardPosition = getWildcardPosition(fuzzyName);
  if (wildCardPosition !== 'none') {
    const matcher = getMatcher(fuzzyName, wildCardPosition);
    for (const resourceName of resources) {
      if (matcher(resourceName)) {
        return true;
      }
    }
  }
}
