/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ISuggestionItem } from '../../../../commands/registry/types';
import { Location } from '../../../../commands/registry/types';
import type { SortingContext } from './types';
import { SuggestionCategory } from './types';
import { detectCategory } from './utils/category_rules';

const CATEGORY_PRIORITIES: Record<SuggestionCategory, number> = {
  [SuggestionCategory.CUSTOM_ACTION]: 0,
  [SuggestionCategory.PROMQL_METRIC_QUALIFIER]: 50,
  [SuggestionCategory.LANGUAGE_KEYWORD]: 50, // BY, WHERE, ON, WITH

  [SuggestionCategory.TIME_PARAM]: 100,

  [SuggestionCategory.PIPE]: 200,
  [SuggestionCategory.COMMA]: 201,
  [SuggestionCategory.VALUE]: 202,

  [SuggestionCategory.CONSTANT_VALUE]: 250, // Prompt text, query text constants

  [SuggestionCategory.USER_DEFINED_COLUMN]: 300,
  [SuggestionCategory.RECOMMENDED_FIELD]: 310,
  [SuggestionCategory.LOOKUP_COMMON_FIELD]: 315,
  [SuggestionCategory.ECS_FIELD]: 330,
  [SuggestionCategory.TIME_FIELD]: 350,
  [SuggestionCategory.FIELD]: 350,

  [SuggestionCategory.OPERATOR]: 400,

  [SuggestionCategory.FUNCTION_TIME_SERIES_AGG]: 500,
  [SuggestionCategory.FUNCTION_AGG]: 500,
  [SuggestionCategory.FUNCTION_SCALAR]: 500,

  [SuggestionCategory.RECOMMENDED_QUERY_WITH_PRIORITY]: 590, // Search query (higher priority)
  [SuggestionCategory.RECOMMENDED_QUERY]: 600,

  [SuggestionCategory.UNKNOWN]: 900,
};

// Context-specific priority adjustments (negative = boost up, positive = push down)
const CONTEXT_BOOSTS: Partial<Record<Location, Partial<Record<SuggestionCategory, number>>>> = {
  [Location.STATS]: {
    [SuggestionCategory.LANGUAGE_KEYWORD]: -40, // From 50 to 10 (after CUSTOM_ACTION)
    [SuggestionCategory.FUNCTION_AGG]: -100, // From 500 to 400
    [SuggestionCategory.FUNCTION_TIME_SERIES_AGG]: -151, // From 500 to 349 (before fields at 350)
  },
  [Location.STATS_BY]: {
    [SuggestionCategory.USER_DEFINED_COLUMN]: -300, // From 300 to 0
  },
  [Location.PROMQL]: {
    // Push language keywords (e.g. "by") after pipe but before operators.
    [SuggestionCategory.LANGUAGE_KEYWORD]: 100, // From 50 to 150
    [SuggestionCategory.PIPE]: -150, // From 200 to 50 (top)
  },
};

export function calculatePriority(item: ISuggestionItem, context: SortingContext): number {
  const category = detectCategory(item);

  // Step 1: Get base priority from category
  const basePriority =
    CATEGORY_PRIORITIES[category] ?? CATEGORY_PRIORITIES[SuggestionCategory.UNKNOWN];

  // Step 2: Apply context-specific boosts
  const locationKey = (
    context.location
      ? `${context.command.toLowerCase()}_${context.location.toLowerCase()}`
      : context.command.toLowerCase()
  ) as Location;

  const contextBoost = CONTEXT_BOOSTS[locationKey]?.[category] ?? 0;

  // Final priority = base + context boost
  return basePriority + contextBoost;
}
