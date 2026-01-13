/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { monaco } from '@kbn/monaco';
import { getConnectorIdSuggestions } from './connector_id/get_connector_id_suggestions';
import { getConnectorTypeSuggestions } from './connector_type/get_connector_type_suggestions';
import {
  createLiquidBlockKeywordCompletions,
  createLiquidFilterCompletions,
  createLiquidSyntaxCompletions,
} from './liquid/liquid_completions';
import { getRRuleSchedulingSuggestions } from './rrule/get_rrule_scheduling_suggestions';
import { getTimezoneSuggestions } from './timezone/get_timezone_suggestions';
import { getTriggerTypeSuggestions } from './trigger_type/get_trigger_type_suggestions';
import { getVariableSuggestions } from './variable/get_variable_suggestions';
import { getWorkflowInputsSuggestions } from './workflow/get_workflow_inputs_suggestions';
import { getWorkflowOutputsSuggestions } from './workflow/get_workflow_outputs_suggestions';
import { getWorkflowSuggestions } from './workflow/get_workflow_suggestions';
import type { ExtendedAutocompleteContext } from '../context/autocomplete.types';

/**
 * Creates an adjusted range for type suggestions that extends to the end of the line
 */
function createAdjustedRangeForType(
  autocompleteContext: ExtendedAutocompleteContext,
  lineParseResult: { valueStartIndex: number }
): monaco.IRange {
  return {
    ...autocompleteContext.range,
    startColumn: lineParseResult.valueStartIndex + 1,
    endColumn: autocompleteContext.line.length + 1, // Go to end of line to allow multi-line insertion
  };
}

/**
 * Handles suggestions based on match type
 */
// event complex switch/case statement is good readable and maintainable
// eslint-disable-next-line complexity
async function handleMatchTypeSuggestions(
  autocompleteContext: ExtendedAutocompleteContext
): Promise<monaco.languages.CompletionItem[] | null> {
  const { lineParseResult } = autocompleteContext;

  if (!lineParseResult) {
    return null;
  }

  switch (lineParseResult.matchType) {
    case 'connector-id':
      return getConnectorIdSuggestions(autocompleteContext);

    case 'workflow-id':
      return getWorkflowSuggestions(autocompleteContext);

    case 'variable-unfinished':
    case 'variable-complete':
    case 'foreach-variable':
      return getVariableSuggestions(autocompleteContext);

    case 'at':
      // @ triggers should only work in value nodes (after colon)
      if (!autocompleteContext.focusedYamlPair) {
        return [];
      }
      return getVariableSuggestions(autocompleteContext);

    case 'liquid-filter':
    case 'liquid-block-filter':
      return createLiquidFilterCompletions(
        autocompleteContext.range,
        lineParseResult.fullKey ?? ''
      );

    case 'liquid-syntax':
      return createLiquidSyntaxCompletions(autocompleteContext.range);

    case 'liquid-block-keyword':
      if (autocompleteContext.isInLiquidBlock) {
        return createLiquidBlockKeywordCompletions(
          autocompleteContext.range,
          lineParseResult.fullKey
        );
      }
      return null;

    case 'type':
      if (autocompleteContext.isInTriggersContext) {
        const adjustedRange = createAdjustedRangeForType(autocompleteContext, lineParseResult);
        return getTriggerTypeSuggestions(lineParseResult.fullKey, adjustedRange);
      }
      if (autocompleteContext.isInStepsContext && autocompleteContext.dynamicConnectorTypes) {
        const adjustedRange = createAdjustedRangeForType(autocompleteContext, lineParseResult);
        return getConnectorTypeSuggestions(
          lineParseResult.fullKey,
          adjustedRange,
          autocompleteContext.dynamicConnectorTypes,
          autocompleteContext.workflowDefinition?.outputs
        );
      }
      return null;

    case 'timezone':
      return getTimezoneSuggestions(
        {
          ...autocompleteContext.range,
          startColumn: lineParseResult.valueStartIndex + 1,
        },
        lineParseResult.fullKey
      );

    case 'workflow-inputs':
      return getWorkflowInputsSuggestions(autocompleteContext);

    default:
      return null;
  }
}

export async function getSuggestions(
  autocompleteContext: ExtendedAutocompleteContext
): Promise<monaco.languages.CompletionItem[]> {
  // Check if we're in a scheduled trigger's with block for RRule suggestions
  if (autocompleteContext.isInScheduledTriggerWithBlock) {
    return getRRuleSchedulingSuggestions(autocompleteContext.range);
  }

  // Handle suggestions based on match type
  const matchTypeSuggestions = await handleMatchTypeSuggestions(autocompleteContext);
  if (matchTypeSuggestions !== null) {
    return matchTypeSuggestions;
  }

  // Check for workflow.output outputs suggestions (not based on line parsing, but on context)
  const workflowOutputsSuggestions = await getWorkflowOutputsSuggestions(autocompleteContext);
  if (workflowOutputsSuggestions.length > 0) {
    return workflowOutputsSuggestions;
  }

  // TODO: Implement connector with block completion
  return [];
}
