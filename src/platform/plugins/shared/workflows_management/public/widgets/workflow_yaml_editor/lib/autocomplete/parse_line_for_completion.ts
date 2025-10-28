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
} from '../../../../../common/lib/regex';
import { parsePath } from '../../../../../common/lib/zod';

interface BaseLineParseResult {
  fullKey: string;
  pathSegments: string[] | null;
  matchType: string;
  match: RegExpMatchArray | null;
}

interface VariableLineParseResult extends BaseLineParseResult {
  matchType: 'at' | 'variable-complete' | 'variable-unfinished';
  match: RegExpMatchArray;
}

interface ForeachVariableLineParseResult extends BaseLineParseResult {
  matchType: 'foreach-variable';
  match: null;
}

interface LiquidLineParseResult extends BaseLineParseResult {
  matchType: 'liquid-filter' | 'liquid-block-filter' | 'liquid-block-keyword';
  match: RegExpMatchArray;
}

interface LiquidSyntaxLineParseResult extends BaseLineParseResult {
  matchType: 'liquid-syntax';
  match: null;
}

interface ConnectorIdLineParseResult extends BaseLineParseResult {
  matchType: 'connector-id';
  match: RegExpMatchArray;
}

interface TypeLineParseResult extends BaseLineParseResult {
  matchType: 'type';
  match: RegExpMatchArray;
}

interface TimezoneLineParseResult extends BaseLineParseResult {
  matchType: 'timezone';
  match: RegExpMatchArray;
}
export type LineParseResult =
  | VariableLineParseResult
  | ForeachVariableLineParseResult
  | LiquidLineParseResult
  | LiquidSyntaxLineParseResult
  | ConnectorIdLineParseResult
  | TypeLineParseResult
  | TimezoneLineParseResult;

export function parseLineForCompletion(lineUpToCursor: string): LineParseResult | null {
  const timezoneFieldMatch = lineUpToCursor.match(/^\s*(?:tzid|timezone)\s*:\s*(.*)$/);
  if (timezoneFieldMatch) {
    const timezonePrefix = timezoneFieldMatch[1].trim();
    return {
      fullKey: timezonePrefix,
      pathSegments: null,
      matchType: 'timezone',
      match: timezoneFieldMatch,
    };
  }

  const typeMatch = lineUpToCursor.match(/^\s*-?\s*(?:name:\s*\w+\s*)?type:\s*(.*)$/i);
  if (typeMatch) {
    const typePrefix = typeMatch[1].replace(/['"]/g, '').trim();
    return {
      fullKey: typePrefix,
      pathSegments: null,
      matchType: 'type',
      match: typeMatch,
    };
  }

  const connectorIdMatch = lineUpToCursor.match(/^\s*connector-id:\s*(.*)$/i);
  if (connectorIdMatch) {
    const connectorId = lineUpToCursor.split('connector-id:')[1].trim();
    return {
      fullKey: connectorId,
      pathSegments: null,
      matchType: 'connector-id',
      match: connectorIdMatch,
    };
  }
  // Try @ trigger first (e.g., "@const" or "@steps.step1")
  const atMatch = [...lineUpToCursor.matchAll(/@(?<key>\S+?)?\.?(?=\s|$)/g)].pop();
  if (atMatch) {
    const fullKey = cleanKey(atMatch.groups?.key ?? '');
    return {
      fullKey,
      pathSegments: parsePath(fullKey),
      matchType: 'at',
      match: atMatch,
    };
  }

  // Check for Liquid filter completion FIRST (e.g., "{{ variable | fil")
  const liquidFilterMatch = lineUpToCursor.match(LIQUID_FILTER_REGEX);
  if (liquidFilterMatch) {
    const filterPrefix = liquidFilterMatch[1] || '';
    return {
      fullKey: filterPrefix,
      pathSegments: null,
      matchType: 'liquid-filter',
      match: liquidFilterMatch,
    };
  }

  // Check for Liquid block filter completion (e.g., "assign variable = value | fil")
  const liquidBlockFilterMatch = lineUpToCursor.match(LIQUID_BLOCK_FILTER_REGEX);
  if (liquidBlockFilterMatch) {
    const filterPrefix = liquidBlockFilterMatch[1] || '';
    return {
      fullKey: filterPrefix,
      pathSegments: null,
      matchType: 'liquid-block-filter',
      match: liquidBlockFilterMatch,
    };
  }

  // Check for Liquid block keyword completion (e.g., "  assign" or "  cas")
  const liquidBlockKeywordMatch = lineUpToCursor.match(LIQUID_BLOCK_KEYWORD_REGEX);
  if (liquidBlockKeywordMatch) {
    const keywordPrefix = liquidBlockKeywordMatch[1] || '';
    return {
      fullKey: keywordPrefix,
      pathSegments: null,
      matchType: 'liquid-block-keyword',
      match: liquidBlockKeywordMatch,
    };
  }

  // Try unfinished mustache (e.g., "{{ consts.api" at end of line)
  const unfinishedMatch = [...lineUpToCursor.matchAll(UNFINISHED_VARIABLE_REGEX_GLOBAL)].pop();
  if (unfinishedMatch) {
    const fullKey = cleanKey(unfinishedMatch.groups?.key ?? '');
    return {
      fullKey,
      pathSegments: parsePath(fullKey),
      matchType: 'variable-unfinished',
      match: unfinishedMatch,
    };
  }

  // Try complete mustache (e.g., "{{ consts.apiUrl }}")
  const completeMatch = [...lineUpToCursor.matchAll(VARIABLE_REGEX_GLOBAL)].pop();
  if (completeMatch) {
    const fullKey = cleanKey(completeMatch.groups?.key ?? '');
    return {
      fullKey,
      pathSegments: parsePath(fullKey),
      matchType: 'variable-complete',
      match: completeMatch,
    };
  }

  const lastWordBeforeCursor = lineUpToCursor.split(' ').pop();
  if (lineUpToCursor.includes('foreach:')) {
    const fullKey = cleanKey(lastWordBeforeCursor ?? '');
    return {
      fullKey,
      pathSegments: parsePath(fullKey),
      matchType: 'foreach-variable',
      match: null,
    };
  }

  // Check for Liquid syntax completion (e.g., "{% ")
  if (lineUpToCursor.match(/\{\%\s*\w*$/)) {
    return {
      fullKey: lastWordBeforeCursor || '',
      pathSegments: null,
      matchType: 'liquid-syntax',
      match: null,
    };
  }

  return null;
}

function cleanKey(key: string) {
  if (key === '.') {
    // special expression in mustache for current object
    return key;
  }
  // remove trailing dot if it exists
  return key.endsWith('.') ? key.slice(0, -1) : key;
}
