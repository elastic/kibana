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
import { getWithBlockSuggestions } from './connector_with/get_with_block_suggestions';
import { getDirectTypeSuggestions } from './get_direct_type_suggestions';
import {
  createLiquidBlockKeywordCompletions,
  createLiquidFilterCompletions,
  createLiquidSyntaxCompletions,
} from './liquid/liquid_completions';
import { getRRuleSchedulingSuggestions } from './rrule/get_rrule_scheduling_suggestions';
import { getTimezoneSuggestions } from './timezone/get_timezone_suggestions';
import { getVariableSuggestions } from './variable/get_variable_suggestions';

export function getSuggestions(
  autocompleteContext: ExtendedAutocompleteContext
): monaco.languages.CompletionItem[] {
  const { lineParseResult } = autocompleteContext;

  if (lineParseResult?.matchType === 'connector-id') {
    return getConnectorIdSuggestions(autocompleteContext);
  }

  // Handle completions inside {{ }} or after @ triggers
  if (
    lineParseResult?.matchType === 'variable-unfinished' ||
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
    return createLiquidFilterCompletions(autocompleteContext);
  }

  // Liquid syntax completion ({% %})
  if (lineParseResult?.matchType === 'liquid-syntax') {
    return createLiquidSyntaxCompletions(autocompleteContext.range);
  }

  // Liquid block keyword completion (inside {%- liquid ... -%})
  if (lineParseResult?.matchType === 'liquid-block-keyword') {
    return createLiquidBlockKeywordCompletions(autocompleteContext);
  }

  // Direct type completion - context-aware
  // Check if we're trying to complete a type field, regardless of schema validation
  // TODO: remove this, schema should be that forgiving so we don't need another handler

  if (lineParseResult?.matchType === 'type') {
    return getDirectTypeSuggestions(autocompleteContext);
  }

  if (lineParseResult?.matchType === 'timezone') {
    const { position } = autocompleteContext;
    // TODO: this should be done in the parseLineForCompletion
    const prefix = lineParseResult.match[1].trim();
    const tzidValueStart =
      (lineParseResult.match.index ?? 0) +
      lineParseResult.match[0].indexOf(lineParseResult.match[1]);
    const tzidValueRange = {
      startLineNumber: position.lineNumber,
      endLineNumber: position.lineNumber,
      startColumn: tzidValueStart + 1,
      endColumn: position.column,
    };

    return getTimezoneSuggestions(tzidValueRange, prefix);
  }

  // Check if we're in a scheduled trigger's with block for RRule suggestions
  if (autocompleteContext.isInScheduledTriggerWithBlock) {
    // We're in a scheduled trigger's with block - provide RRule suggestions
    return getRRuleSchedulingSuggestions(autocompleteContext.range);
  }

  const { model, position } = autocompleteContext;

  return getWithBlockSuggestions({ ...autocompleteContext, model, position });
}
