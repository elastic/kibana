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
import { getCustomPropertySuggestions } from './custom_property/get_custom_property_suggestions';
import { getJsonSchemaSuggestions } from './json_schema/get_json_schema_suggestions';
import {
  createLiquidBlockKeywordCompletions,
  createLiquidFilterCompletions,
  createLiquidSyntaxCompletions,
} from './liquid/liquid_completions';
import { getRRuleSchedulingSuggestions } from './rrule/get_rrule_scheduling_suggestions';
import { getTimezoneSuggestions } from './timezone/get_timezone_suggestions';
import { getTriggerTypeSuggestions } from './trigger_type/get_trigger_type_suggestions';
import { getVariableSuggestions } from './variable/get_variable_suggestions';
import { getPropertyHandler } from '../../../../../../common/schema';
import type { ExtendedAutocompleteContext } from '../context/autocomplete.types';

export async function getSuggestions(
  autocompleteContext: ExtendedAutocompleteContext
): Promise<monaco.languages.CompletionItem[]> {
  // console.log('getSuggestions', autocompleteContext);
  const { lineParseResult } = autocompleteContext;

  // Check if we're in a scheduled trigger's with block for RRule suggestions
  // e.g.
  // triggers:
  // - type: scheduled
  //   with:
  //     |<-
  if (autocompleteContext.isInScheduledTriggerWithBlock) {
    // We're in a scheduled trigger's with block - provide RRule suggestions
    return getRRuleSchedulingSuggestions(autocompleteContext.range);
  }

  // Connector ID completion
  // e.g.
  // steps:
  // - name: notify-slack
  //   type: slack
  //   connector-id: |<-
  if (lineParseResult?.matchType === 'connector-id') {
    return getConnectorIdSuggestions(autocompleteContext);
  }

  // Handle completions inside {{ }} or foreach variables
  if (
    lineParseResult?.matchType === 'variable-unfinished' ||
    lineParseResult?.matchType === 'variable-complete' ||
    lineParseResult?.matchType === 'foreach-variable'
  ) {
    return getVariableSuggestions(autocompleteContext);
  }

  // @ triggers should only work in value nodes (after colon)
  // This prevents @ completions from appearing in keys, comments, or root-level positions
  if (lineParseResult?.matchType === 'at') {
    // Check if we're in a value node using focusedYamlPair
    // focusedYamlPair is only set when cursor is in a Pair.value node
    if (!autocompleteContext.focusedYamlPair) {
      // Not in a value node, skip @ completions
      return [];
    }
    return getVariableSuggestions(autocompleteContext);
  }

  // Liquid filter completion
  // e.g.
  // steps:
  //     message: "{{ user.name | |<-
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

  // Trigger type completion
  // e.g.
  // triggers:
  // - type: |<-
  if (lineParseResult?.matchType === 'type' && autocompleteContext.isInTriggersContext) {
    // For snippets, we need to replace from the start of the type value to the end of the line
    const adjustedRange = {
      ...autocompleteContext.range,
      startColumn: lineParseResult.valueStartIndex + 1,
      endColumn: autocompleteContext.line.length + 1, // Go to end of line to allow multi-line insertion
    };
    return getTriggerTypeSuggestions(lineParseResult.fullKey, adjustedRange);
  }

  // Connector type completion
  // e.g.
  // steps:
  // - name: search-errors
  //   type: |<-
  if (
    lineParseResult?.matchType === 'type' &&
    autocompleteContext.isInStepsContext &&
    autocompleteContext.dynamicConnectorTypes
  ) {
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

  // Timezone completion
  // e.g.
  // triggers:
  // - type: scheduled
  //   with:
  //     rrule:
  //       freq: DAILY
  //       interval: 1
  //       tzid: |<-
  if (lineParseResult?.matchType === 'timezone') {
    const adjustedRange = {
      ...autocompleteContext.range,
      startColumn: lineParseResult.valueStartIndex + 1,
    };

    return getTimezoneSuggestions(adjustedRange, lineParseResult.fullKey);
  }

  // JSON Schema autocompletion for inputs.properties
  // e.g.
  // inputs:
  //   properties:
  //     myProperty:
  //       type: |<- (suggest: string, number, boolean, object, array, null)
  //       format: |<- (suggest: email, uri, date-time, etc.)
  //       enum: |<- (suggest enum values from schema)
  // This should be checked BEFORE other type completions to avoid conflicts
  // but AFTER variable/connector completions which are more specific
  const jsonSchemaSuggestions = getJsonSchemaSuggestions(autocompleteContext);
  if (jsonSchemaSuggestions.length > 0) {
    return jsonSchemaSuggestions;
  }

  // Custom property completion for steps registered via workflows_extensions
  return getCustomPropertySuggestions(
    autocompleteContext,
    (stepType: string, scope: 'config' | 'input', key: string) =>
      getPropertyHandler(stepType, scope, key)
  );

  // TODO: Implement connector with block completion
  // Connector with block completion
  // e.g.
  // steps:
  // - name: search-alerts
  //   type: elasticsearch.search
  //   with:
  //     index: "alerts-*"
  //     query:
  //       range:
  //         "@timestamp":
  //           gte: "now-1h"
  //     |<-
  // return [];
}
