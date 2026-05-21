/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { monaco } from '@kbn/monaco';
import { LoopStepTypes } from '@kbn/workflows';
import { getConnectorIdSuggestions } from './connector_id/get_connector_id_suggestions';
import { getConnectorTypeSuggestions } from './connector_type/get_connector_type_suggestions';
import { getJsonSchemaSuggestions } from './json_schema/get_json_schema_suggestions';
import {
  createLiquidBlockKeywordCompletions,
  createLiquidFilterCompletions,
  createLiquidSyntaxCompletions,
} from './liquid/liquid_completions';
import { getRRuleSchedulingSuggestions } from './rrule/get_rrule_scheduling_suggestions';
import { getStepPropertySuggestions } from './step_property/get_step_property_suggestions';
import type { GetStepPropertyHandler } from './step_property/get_step_property_suggestions';
import { getTimezoneSuggestions } from './timezone/get_timezone_suggestions';
import { getTriggerConditionKqlSuggestions } from './trigger_condition/get_trigger_condition_kql_suggestions';
import { getTriggerTypeSuggestions } from './trigger_type/get_trigger_type_suggestions';
import { getVariableSuggestions } from './variable/get_variable_suggestions';
import { getWorkflowInputsSuggestions } from './workflow/get_workflow_inputs_suggestions';
import { getWorkflowOutputsSuggestions } from './workflow/get_workflow_outputs_suggestions';
import { getWorkflowSuggestions } from './workflow/get_workflow_suggestions';
import type { WorkflowKqlCompletionServices } from './workflow_kql_completion_services';
import { getPropertyHandler as getPropertyHandlerFromSchema } from '../../../../../../common/schema';
import type {
  AutocompleteContext,
  ExtendedAutocompleteContext,
} from '../context/autocomplete.types';

export type { WorkflowKqlCompletionServices } from './workflow_kql_completion_services';

const loopStepTypes = new Set<string>(LoopStepTypes);

/**
 * Checks whether the current cursor position in the YAML document is inside
 * the body (`steps` array) of a foreach or while loop step.
 */
export function isInsideLoopBody(ctx: Pick<AutocompleteContext, 'yamlDocument' | 'path'>): boolean {
  const { yamlDocument, path } = ctx;
  if (!yamlDocument || !path) return false;

  for (let i = 0; i < path.length - 2; i++) {
    if (path[i] === 'steps' && typeof path[i + 1] === 'number') {
      const stepTypePath = [...path.slice(0, i + 2), 'type'];
      const stepType = yamlDocument.getIn(stepTypePath);
      if (typeof stepType === 'string' && loopStepTypes.has(stepType)) {
        const remainingPath = path.slice(i + 2);
        if (remainingPath[0] === 'steps') {
          return true;
        }
      }
    }
  }
  return false;
}

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
          isInsideLoopBody(autocompleteContext)
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
  autocompleteContext: ExtendedAutocompleteContext,
  kqlServices?: WorkflowKqlCompletionServices,
  getPropertyHandler?: GetStepPropertyHandler
): Promise<monaco.languages.CompletionItem[]> {
  if (
    kqlServices &&
    kqlServices?.kql &&
    kqlServices?.fieldFormats &&
    autocompleteContext.isInTriggerConditionField &&
    autocompleteContext.triggerConditionDefinition
  ) {
    return getTriggerConditionKqlSuggestions(autocompleteContext, kqlServices);
  }

  // Check if we're in a scheduled trigger's with block for RRule suggestions
  if (autocompleteContext.isInScheduledTriggerWithBlock) {
    return getRRuleSchedulingSuggestions(autocompleteContext.range);
  }

  const matchTypeSuggestions = await handleMatchTypeSuggestions(autocompleteContext);
  if (matchTypeSuggestions !== null) {
    return matchTypeSuggestions;
  }

  // Path-based workflow inputs detection: when the YAML AST path indicates
  // we're inside `with.inputs` of a workflow step, try input suggestions
  // even if the line parser didn't produce a 'workflow-inputs' matchType.
  if (autocompleteContext.isInWorkflowInputsContext) {
    const inputsSuggestions = await getWorkflowInputsSuggestions(autocompleteContext);
    if (inputsSuggestions !== null) {
      return inputsSuggestions;
    }
  }

  const workflowOutputSuggestions = await getWorkflowOutputsSuggestions(autocompleteContext);
  if (workflowOutputSuggestions.length > 0) {
    return workflowOutputSuggestions;
  }

  // JSON Schema autocompletion for inputs.properties
  const jsonSchemaSuggestions = getJsonSchemaSuggestions(autocompleteContext);
  if (jsonSchemaSuggestions.length > 0) {
    return jsonSchemaSuggestions;
  }

  // Step property completion (extension-registered steps and internal step editor handlers)
  const resolvePropertyHandler = getPropertyHandler ?? getPropertyHandlerFromSchema;
  return getStepPropertySuggestions(autocompleteContext, resolvePropertyHandler);
}
