/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { monaco } from '@kbn/monaco';
import type { ExtendedAutocompleteContext } from './autocomplete.types';
import { getConnectorIdSuggestions } from './connector_id/get_connector_id_suggestions';
import { getConnectorTypeSuggestions } from './connector_type/get_connector_type_suggestions';
import { getWithBlockSuggestions } from './connector_with/get_with_block_suggestions';
import {
  createLiquidBlockKeywordCompletions,
  createLiquidFilterCompletions,
  createLiquidSyntaxCompletions,
} from './liquid/liquid_completions';
import { getRRuleSchedulingSuggestions } from './rrule/get_rrule_scheduling_suggestions';
import { getTimezoneSuggestions } from './timezone/get_timezone_suggestions';
import { getTriggerTypeSuggestions } from './trigger_type/get_trigger_type_suggestions';
import { isInTriggersContext } from './triggers_utils';
import { getVariableSuggestions } from './variable/get_variable_suggestions';

export function getSuggestions(
  autocompleteContext: ExtendedAutocompleteContext
): monaco.languages.CompletionItem[] {
  // console.log('getSuggestions', autocompleteContext);
  const { lineParseResult } = autocompleteContext;

  // Check if we're in a scheduled trigger's with block for RRule suggestions
  if (autocompleteContext.isInScheduledTriggerWithBlock) {
    // We're in a scheduled trigger's with block - provide RRule suggestions
    return getRRuleSchedulingSuggestions(autocompleteContext.range);
  }

  if (lineParseResult?.matchType === 'connector-id') {
    return getConnectorIdSuggestions(autocompleteContext);
  }

  // Handle completions inside {{ }} or after @ triggers
  if (
    lineParseResult?.matchType === 'variable-unfinished' ||
    lineParseResult?.matchType === 'variable-complete' ||
    lineParseResult?.matchType === 'at' ||
    lineParseResult?.matchType === 'foreach-variable'
  ) {
    return getVariableSuggestions(autocompleteContext);
  }

  // Liquid filter completion
  if (
    lineParseResult?.matchType === 'liquid-filter' ||
    lineParseResult?.matchType === 'liquid-block-filter'
  ) {
    return createLiquidFilterCompletions(autocompleteContext.range, lineParseResult?.fullKey ?? '');
  }

  // Liquid syntax completion ({% %})
  if (lineParseResult?.matchType === 'liquid-syntax') {
    return createLiquidSyntaxCompletions(autocompleteContext.range);
  }

  // Liquid block keyword completion (inside {%- liquid ... -%})
  if (
    lineParseResult?.matchType === 'liquid-block-keyword' &&
    autocompleteContext.isInLiquidBlock
  ) {
    return createLiquidBlockKeywordCompletions(autocompleteContext.range, lineParseResult?.fullKey);
  }

  // Direct type completion - context-aware
  // Check if we're trying to complete a type field, regardless of schema validation
  // TODO: remove this, schema should be that forgiving so we don't need another handler

  if (lineParseResult?.matchType === 'type' && isInTriggersContext(autocompleteContext.path)) {
    // For snippets, we need to replace from the start of the type value to the end of the line
    const adjustedRange = {
      ...autocompleteContext.range,
      startColumn: lineParseResult.valueStartIndex + 1,
      endColumn: autocompleteContext.line.length + 1, // Go to end of line to allow multi-line insertion
    };
    return getTriggerTypeSuggestions(lineParseResult.fullKey, adjustedRange);
  }

  if (lineParseResult?.matchType === 'type' && autocompleteContext.dynamicConnectorTypes) {
    const adjustedRange = {
      ...autocompleteContext.range,
      startColumn: lineParseResult.valueStartIndex + 1,
      endColumn: autocompleteContext.line.length + 1, // Go to end of line to allow multi-line insertion
    };
    return getConnectorTypeSuggestions(
      lineParseResult.fullKey,
      adjustedRange,
      autocompleteContext.dynamicConnectorTypes
    );
  }

  if (lineParseResult?.matchType === 'timezone') {
    const adjustedRange = {
      ...autocompleteContext.range,
      startColumn: lineParseResult.valueStartIndex + 1,
    };

    return getTimezoneSuggestions(adjustedRange, lineParseResult.fullKey);
  }

  const { model, position } = autocompleteContext;

  return getWithBlockSuggestions({ ...autocompleteContext, model, position });
}
