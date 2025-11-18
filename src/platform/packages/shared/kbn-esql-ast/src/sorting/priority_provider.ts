/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ISuggestionItem } from '../commands_registry/types';
import type { SortingContext } from './types';
import { SuggestionCategory } from './types';
import { detectCategory } from './utils/category_rules';

// Lower number = higher priority (appears first)
const BASE_PRIORITIES: Record<SuggestionCategory, number> = {
  // Critical UI elements (eg. create control)
  [SuggestionCategory.CRITICAL_ACTION]: 0,

  // User-defined columns
  [SuggestionCategory.USER_DEFINED_COLUMN]: 50,

  // Structural elements
  [SuggestionCategory.PIPE]: 100,
  [SuggestionCategory.COMMA]: 150,

  // Time parameters (?_tstart, ?_tend)
  [SuggestionCategory.TIME_PARAM]: 200,

  // All fields/columns
  [SuggestionCategory.RECOMMENDED_FIELD]: 250,
  [SuggestionCategory.TIME_FIELD]: 300,
  [SuggestionCategory.ECS_FIELD]: 350,
  [SuggestionCategory.FIELD]: 400,

  // Operators
  [SuggestionCategory.OPERATOR_ARITHMETIC]: 410,
  [SuggestionCategory.OPERATOR_LOGICAL]: 420,
  [SuggestionCategory.OPERATOR_COMPARISON]: 430,
  [SuggestionCategory.OPERATOR_NULL_CHECK]: 440,
  [SuggestionCategory.OPERATOR_IN]: 450,
  [SuggestionCategory.OPERATOR_PATTERN]: 460,
  [SuggestionCategory.OPERATOR]: 490, // Fallback

  // All functions (after operators as requested)
  [SuggestionCategory.FUNCTION_TIME_SERIES_AGG]: 500,
  [SuggestionCategory.FUNCTION_AGG]: 550,
  [SuggestionCategory.FUNCTION_SCALAR]: 600,

  // Processing commands and keywords
  [SuggestionCategory.PROCESSING_COMMAND]: 650,
  [SuggestionCategory.KEYWORD]: 700,
  [SuggestionCategory.UNKNOWN]: 750,
};

// Context-specific priority adjustments (negative = boost up, positive = push down)
const CONTEXT_BOOSTS: Record<string, Partial<Record<SuggestionCategory, number>>> = {
  STATS: {
    [SuggestionCategory.FUNCTION_SCALAR]: +300, // 600 + 300 = 900 (push down scalar functions)
  },
  EVAL: {
    [SuggestionCategory.FUNCTION_SCALAR]: -400, // scalar functions before fields
  },
};

export function calculatePriority(item: ISuggestionItem, context: SortingContext): number {
  const category = detectCategory(item);
  const basePriority = BASE_PRIORITIES[category] ?? BASE_PRIORITIES[SuggestionCategory.UNKNOWN];

  const commandBoosts = CONTEXT_BOOSTS[context.command.toUpperCase()];
  if (!commandBoosts) {
    return basePriority;
  }

  const contextBoost = commandBoosts[category] ?? 0;

  return basePriority + contextBoost;
}
