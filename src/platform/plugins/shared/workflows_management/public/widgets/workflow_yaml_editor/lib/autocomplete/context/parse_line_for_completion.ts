/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  LIQUID_BLOCK_FILTER_REGEX,
  LIQUID_BLOCK_KEYWORD_REGEX,
  LIQUID_FILTER_REGEX,
  UNFINISHED_VARIABLE_REGEX_GLOBAL,
  VARIABLE_REGEX_GLOBAL,
} from '../../../../../../common/lib/regex';
import { parsePath } from '../../../../../../common/lib/zod';

interface BaseLineParseResult {
  fullKey: string;
  matchType: string;
  match: RegExpMatchArray | null;
}

export interface VariableLineParseResult extends BaseLineParseResult {
  matchType: 'at' | 'variable-complete' | 'variable-unfinished';
  match: RegExpMatchArray;
  pathSegments: string[] | null;
  lastPathSegment: string | null;
}

export interface ForeachVariableLineParseResult extends BaseLineParseResult {
  matchType: 'foreach-variable';
  match: null;
  pathSegments: string[] | null;
  lastPathSegment: string | null;
}

export interface LiquidLineParseResult extends BaseLineParseResult {
  matchType: 'liquid-filter' | 'liquid-block-filter' | 'liquid-block-keyword';
  match: RegExpMatchArray;
}

export interface LiquidSyntaxLineParseResult extends BaseLineParseResult {
  matchType: 'liquid-syntax';
  match: null;
}

export interface ConnectorIdLineParseResult extends BaseLineParseResult {
  matchType: 'connector-id';
  match: RegExpMatchArray;
  valueStartIndex: number;
}

export interface TypeLineParseResult extends BaseLineParseResult {
  matchType: 'type';
  match: RegExpMatchArray;
  valueStartIndex: number;
}

export interface TimezoneLineParseResult extends BaseLineParseResult {
  matchType: 'timezone';
  match: RegExpMatchArray;
  valueStartIndex: number;
}

export type LineParseResult =
  | VariableLineParseResult
  | ForeachVariableLineParseResult
  | LiquidLineParseResult
  | LiquidSyntaxLineParseResult
  | ConnectorIdLineParseResult
  | TypeLineParseResult
  | TimezoneLineParseResult;

// eslint-disable-next-line complexity
export function parseLineForCompletion(lineUpToCursor: string): LineParseResult | null {
  const timezoneFieldMatch = lineUpToCursor.match(
    /^(?<prefix>\s*(?:tzid|timezone)\s*:\s*)(?<value>.*)$/
  );
  if (timezoneFieldMatch && timezoneFieldMatch.groups) {
    const timezonePrefix = timezoneFieldMatch.groups.value.trim();
    return {
      matchType: 'timezone',
      fullKey: timezonePrefix,
      match: timezoneFieldMatch,
      // @ts-expect-error upgrade typescript v5.9.3
      valueStartIndex: timezoneFieldMatch.groups?.prefix.length + 1 ?? 0,
    };
  }

  const typeMatch = lineUpToCursor.match(/^(?<prefix>\s*-?\s*type:)\s*(?<value>.*)$/);
  if (typeMatch && typeMatch.groups) {
    const typePrefix = typeMatch.groups.value.replace(/['"]/g, '').trim();
    return {
      matchType: 'type',
      fullKey: typePrefix,
      match: typeMatch,
      valueStartIndex: typeMatch.groups.prefix.length + 1,
    };
  }

  const connectorIdMatch = lineUpToCursor.match(/^(?<prefix>\s*connector-id:)\s*(?<value>.*)$/);
  if (connectorIdMatch && connectorIdMatch.groups) {
    const connectorId = connectorIdMatch.groups?.value.trim() ?? '';
    return {
      matchType: 'connector-id',
      fullKey: connectorId,
      match: connectorIdMatch,
      // +1 for the space char
      valueStartIndex: connectorIdMatch.groups.prefix.length + 1,
    };
  }
  // Try @ trigger first (e.g., "@const" or "@steps.step1")
  // If we're inside {{ }} braces, extract the path before @ and use it as the context
  const isInsideBraces =
    (lineUpToCursor.match(/\{\{/g) || []).length > (lineUpToCursor.match(/\}\}/g) || []).length;
  const atMatch = [...lineUpToCursor.matchAll(/@(?<key>\S+?)?\.?(?=\s|$)/g)].pop();
  if (atMatch) {
    let fullKey = cleanKey(atMatch.groups?.key ?? '');

    // If we're inside braces and @ has no key, try to extract the path before @
    let extractedPathBeforeAt = false;
    if (isInsideBraces && !fullKey) {
      // Find the last {{ before @ and extract the path segment immediately before @
      // This allows multiple @ completions in the same expression (e.g., "{{ const.@ + inputs.@")
      const atIndex = lineUpToCursor.lastIndexOf('@');
      if (atIndex !== -1) {
        const beforeAt = lineUpToCursor.substring(0, atIndex);
        // Find the last {{ before @ to ensure we're inside braces
        const lastBraceIndex = beforeAt.lastIndexOf('{{');
        if (lastBraceIndex !== -1) {
          // Extract only the path segment immediately before @ (not everything from {{ to @)
          // Look for a valid path pattern: word.word. or word. or just word before @
          // This handles cases like "{{ const.@ + inputs.@" where we want "inputs" not "const.@ + inputs"
          const pathMatch = beforeAt.match(
            /(?:^|\s|[\+\-\*\/\(\)])([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)\.?\s*$/
          );
          if (pathMatch && pathMatch[1]) {
            const pathBeforeAt = pathMatch[1].trim();
            if (pathBeforeAt) {
              fullKey = pathBeforeAt;
              // When we extract a path before @, we want to show all properties of that path
              extractedPathBeforeAt = true;
            }
          }
        }
      }
    }

    const pathSegments = parsePath(fullKey);
    return {
      matchType: 'at',
      fullKey,
      pathSegments,
      lastPathSegment: extractedPathBeforeAt
        ? null // When we extracted a path before @, always use null to show all properties
        : getLastPathSegment(lineUpToCursor, pathSegments),
      match: atMatch,
    };
  }

  // Check for Liquid filter completion FIRST (e.g., "{{ variable | fil")
  const liquidFilterMatch = lineUpToCursor.match(LIQUID_FILTER_REGEX);
  if (liquidFilterMatch) {
    const filterPrefix = liquidFilterMatch[1] || '';
    return {
      matchType: 'liquid-filter',
      fullKey: filterPrefix,
      match: liquidFilterMatch,
    };
  }

  // Check for Liquid block filter completion (e.g., "assign variable = value | fil")
  const liquidBlockFilterMatch = lineUpToCursor.match(LIQUID_BLOCK_FILTER_REGEX);
  if (liquidBlockFilterMatch) {
    const filterPrefix = liquidBlockFilterMatch[1] || '';
    return {
      matchType: 'liquid-block-filter',
      fullKey: filterPrefix,
      match: liquidBlockFilterMatch,
    };
  }

  // Check for Liquid block keyword completion (e.g., "  assign" or "  cas")
  const liquidBlockKeywordMatch = lineUpToCursor.match(LIQUID_BLOCK_KEYWORD_REGEX);
  if (liquidBlockKeywordMatch) {
    const keywordPrefix = liquidBlockKeywordMatch[1] || '';
    return {
      matchType: 'liquid-block-keyword',
      fullKey: keywordPrefix,
      match: liquidBlockKeywordMatch,
    };
  }

  // Try unfinished mustache (e.g., "{{ consts.api" at end of line)
  const unfinishedMatch = [...lineUpToCursor.matchAll(UNFINISHED_VARIABLE_REGEX_GLOBAL)].pop();
  if (unfinishedMatch) {
    const fullKey = cleanKey(unfinishedMatch.groups?.key ?? '');
    const pathSegments = parsePath(fullKey);
    return {
      matchType: 'variable-unfinished',
      fullKey,
      pathSegments,
      lastPathSegment: getLastPathSegment(lineUpToCursor, pathSegments),
      match: unfinishedMatch,
    };
  }

  // Try complete mustache (e.g., "{{ consts.apiUrl }}")
  const completeMatch = [...lineUpToCursor.matchAll(VARIABLE_REGEX_GLOBAL)].pop();
  if (completeMatch) {
    const fullKey = cleanKey(completeMatch.groups?.key ?? '');
    const pathSegments = parsePath(fullKey);
    return {
      matchType: 'variable-complete',
      fullKey,
      pathSegments,
      lastPathSegment: getLastPathSegment(lineUpToCursor, pathSegments),
      match: completeMatch,
    };
  }

  const lastWordBeforeCursor = lineUpToCursor.split(' ').pop();
  if (lineUpToCursor.includes('foreach:')) {
    const fullKey = cleanKey(lastWordBeforeCursor ?? '');
    const pathSegments = parsePath(fullKey);
    return {
      matchType: 'foreach-variable',
      fullKey,
      pathSegments,
      lastPathSegment: getLastPathSegment(lineUpToCursor, pathSegments),
      match: null,
    };
  }

  // Check for Liquid syntax completion (e.g., "{% ")
  if (lineUpToCursor.match(/\{\%\s*\w*$/)) {
    return {
      fullKey: lastWordBeforeCursor || '',
      matchType: 'liquid-syntax',
      match: null,
    };
  }

  return null;
}

function getLastPathSegment(lineUpToCursor: string, pathSegments: string[] | null) {
  return lineUpToCursor.endsWith('.') ? null : pathSegments?.at(-1) ?? null;
}

function cleanKey(key: string) {
  if (key === '.') {
    // special expression in mustache for current object
    return key;
  }
  // remove trailing dot if it exists
  return key.endsWith('.') ? key.slice(0, -1) : key;
}

export function isVariableLineParseResult(
  lineParseResult: LineParseResult
): lineParseResult is VariableLineParseResult {
  return (
    lineParseResult.matchType === 'variable-unfinished' ||
    lineParseResult.matchType === 'variable-complete' ||
    lineParseResult.matchType === 'at' ||
    lineParseResult.matchType === 'foreach-variable'
  );
}
