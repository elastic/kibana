/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { monaco } from '@kbn/monaco';
import type { MinimalWorkflowDetailState } from './autocomplete/autocomplete.types';
import { buildAutocompleteContext } from './autocomplete/build_autocomplete_context';
import { getConnectorIdSuggestions } from './autocomplete/get_connector_id_suggestions';
import { getDirectTypeSuggestions } from './autocomplete/get_direct_type_suggestions';
import { getRRuleSchedulingSuggestions } from './autocomplete/get_rrule_scheduling_suggestions';
import { getTimezoneSuggestions } from './autocomplete/get_timezone_suggestions';
import { getVariableSuggestions } from './autocomplete/get_variable_suggestions';
import { getWithBlockSuggestions } from './autocomplete/get_with_block_suggestions';
import {
  createLiquidBlockKeywordCompletions,
  createLiquidFilterCompletions,
  createLiquidSyntaxCompletions,
} from './liquid_completions';

export function getCompletionItemProvider(
  getState: () => MinimalWorkflowDetailState | undefined
): monaco.languages.CompletionItemProvider {
  return {
    // Trigger characters for completion:
    // '@' - variable references
    // '.' - property access within variables
    // ' ' - space, used for separating tokens in Liquid syntax
    // '|' - Liquid filters (e.g., {{ variable | filter }})
    // '{' - start of Liquid blocks (e.g., {{ ... }})
    triggerCharacters: ['@', '.', ' ', '|', '{'],
    provideCompletionItems: (model, position, completionContext) => {
      const editorState = getState();
      if (!editorState) {
        return {
          suggestions: [],
          incomplete: false,
        };
      }
      const autocompleteContext = buildAutocompleteContext({
        editorState,
        model,
        position,
        completionContext,
      });
      if (!autocompleteContext) {
        return {
          suggestions: [],
          incomplete: false,
        };
      }

      const { lineParseResult } = autocompleteContext;

      if (lineParseResult?.matchType === 'connector-id') {
        const connectorIdSuggestions = getConnectorIdSuggestions(autocompleteContext);

        return {
          suggestions: connectorIdSuggestions,
          incomplete: false,
        };
      }

      // Handle completions inside {{ }} or after @ triggers
      if (
        lineParseResult?.matchType === 'variable-unfinished' ||
        lineParseResult?.matchType === 'at' ||
        lineParseResult?.matchType === 'foreach-variable'
      ) {
        const variableSuggestions = getVariableSuggestions(autocompleteContext);

        return {
          suggestions: variableSuggestions,
          incomplete: false,
        };
      }

      // Liquid filter completion
      if (
        lineParseResult?.matchType === 'liquid-filter' ||
        lineParseResult?.matchType === 'liquid-block-filter'
      ) {
        const liquidFilterSuggestions = createLiquidFilterCompletions(autocompleteContext);

        return {
          suggestions: liquidFilterSuggestions,
          incomplete: false,
        };
      }

      // Liquid syntax completion ({% %})
      if (lineParseResult?.matchType === 'liquid-syntax') {
        const syntaxSuggestions = createLiquidSyntaxCompletions(autocompleteContext.range);

        return {
          suggestions: syntaxSuggestions,
          incomplete: false,
        };
      }

      // Liquid block keyword completion (inside {%- liquid ... -%})
      if (lineParseResult?.matchType === 'liquid-block-keyword') {
        const keywordSuggestions = createLiquidBlockKeywordCompletions(autocompleteContext);

        return {
          suggestions: keywordSuggestions,
          incomplete: false,
        };
      }

      // Direct type completion - context-aware
      // Check if we're trying to complete a type field, regardless of schema validation

      if (lineParseResult?.matchType === 'type') {
        const typeSuggestions = getDirectTypeSuggestions(autocompleteContext);
        return {
          suggestions: typeSuggestions,
          incomplete: false,
        };
      }

      if (lineParseResult?.matchType === 'timezone') {
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

        const timezoneSuggestions = getTimezoneSuggestions(tzidValueRange, prefix);

        return {
          suggestions: timezoneSuggestions,
          incomplete: true,
        };
      }

      // Check if we're in a scheduled trigger's with block for RRule suggestions
      if (autocompleteContext.isInScheduledTriggerWithBlock) {
        // We're in a scheduled trigger's with block - provide RRule suggestions
        const rruleSuggestions = getRRuleSchedulingSuggestions(autocompleteContext.range);

        return {
          suggestions: rruleSuggestions,
          incomplete: false,
        };
      }

      return {
        suggestions: getWithBlockSuggestions({ ...autocompleteContext, model, position }),
        incomplete: false,
      };
    },
  };
}
