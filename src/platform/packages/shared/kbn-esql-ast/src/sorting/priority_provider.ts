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

const CATEGORY_PRIORITIES: Record<SuggestionCategory, number> = {
  [SuggestionCategory.CRITICAL_ACTION]: 0,
  [SuggestionCategory.KEYWORD_CLAUSE]: 50, // BY, WHERE, ON, WITH

  [SuggestionCategory.TIME_PARAM]: 100,

  [SuggestionCategory.COMMA]: 200,
  [SuggestionCategory.PIPE]: 200,
  [SuggestionCategory.KEYWORD]: 200,

  [SuggestionCategory.CONSTANT_VALUE]: 250, // Prompt text, query text constants

  [SuggestionCategory.USER_DEFINED_COLUMN]: 300,
  [SuggestionCategory.RECOMMENDED_FIELD]: 310,
  [SuggestionCategory.ECS_FIELD]: 330,
  [SuggestionCategory.TIME_FIELD]: 350,
  [SuggestionCategory.FIELD]: 350,

  [SuggestionCategory.OPERATOR]: 400,

  [SuggestionCategory.FUNCTION_TIME_SERIES_AGG]: 500,
  [SuggestionCategory.FUNCTION_AGG]: 500,
  [SuggestionCategory.FUNCTION_SCALAR]: 500,

  [SuggestionCategory.RECOMMENDED_QUERY_SEARCH]: 590, // Search query (higher priority)
  [SuggestionCategory.RECOMMENDED_QUERY]: 600,

  [SuggestionCategory.UNKNOWN]: 900,
};

// Context-specific priority adjustments (negative = boost up, positive = push down)
// Structure: { 'COMMAND' } or { 'COMMAND:LOCATION' } for more specific contexts
const CONTEXT_BOOSTS: Record<string, Partial<Record<SuggestionCategory, number>>> = {
  'STATS:BY': {
    [SuggestionCategory.USER_DEFINED_COLUMN]: -300, // From 300 to 0
  },
};

export function calculatePriority(item: ISuggestionItem, context: SortingContext): number {
  const category = detectCategory(item);

  // Step 1: Get base priority from category
  const basePriority =
    CATEGORY_PRIORITIES[category] ?? CATEGORY_PRIORITIES[SuggestionCategory.UNKNOWN];

  // Step 2: Apply context-specific boosts
  const commandKey = context.command.toUpperCase();
  const locationKey = context.location?.toUpperCase();

  // Try specific location first (e.g., "STATS:BY"), then fall back to command only
  const contextKey = locationKey ? `${commandKey}:${locationKey}` : commandKey;
  const contextBoost =
    CONTEXT_BOOSTS[contextKey]?.[category] ?? CONTEXT_BOOSTS[commandKey]?.[category] ?? 0;

  // Final priority = base + context boost
  return basePriority + contextBoost;
}
