/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '@kbn/monaco';
import { buildAutocompleteContext } from './context/build_autocomplete_context';
import { getAllYamlProviders } from './intercept_monaco_yaml_provider';
import { getSuggestions, isInsideLoopBody } from './suggestions/get_suggestions';
import type { GetStepPropertyHandler } from './suggestions/step_property/get_step_property_suggestions';
import { isInWorkflowOutputWithBlock } from './suggestions/workflow/get_workflow_outputs_suggestions';
import type { WorkflowKqlCompletionServices } from './suggestions/workflow_kql_completion_services';
import { isDeprecatedStepType } from '../../../../../common/schema';
import type { WorkflowDetailState } from '../../../../entities/workflows/store';
import {
  emitSuggestions,
  type EnrichedSuggestionItem,
  type SuggestionCategory,
} from '../custom_suggest_widget';

// Unique identifier for the workflow completion provider
export const WORKFLOW_COMPLETION_PROVIDER_ID = 'workflows-yaml-completion-provider';
// Snippet enum alias to improve code readability
const INSERT_AS_SNIPPET = monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet;

/**
 * Step types that are only valid inside loop bodies (foreach / while).
 * The monaco-yaml schema provider suggests them everywhere, so the
 * completion provider must strip them when the cursor is outside a loop.
 */
const LOOP_ONLY_STEP_TYPES = new Set(['loop.break', 'loop.continue']);

/**
 * Match types where the cursor is inside a Liquid/variable expression.
 * The YAML schema provider cannot contribute suggestions for these contexts
 * and can block the completion pipeline for seconds on large documents.
 */
const TEMPLATE_EXPRESSION_MATCH_TYPES = new Set([
  'variable-unfinished',
  'variable-complete',
  'at',
  'foreach-variable',
  'liquid-filter',
  'liquid-block-filter',
  'liquid-syntax',
]);

/**
 * Get the deduplication key for a suggestion.
 * Uses filterText if available (contains the actual connector type),
 * otherwise falls back to the label.
 */
function getDeduplicationKey(suggestion: monaco.languages.CompletionItem): string {
  // Prefer filterText as it contains the actual technical name (e.g., 'kibana.createCaseDefaultSpace')
  // even when the label shows a cleaner display name (e.g., 'kibana.createCase')
  if (suggestion.filterText) {
    return suggestion.filterText;
  }
  return typeof suggestion.label === 'string' ? suggestion.label : suggestion.label.label;
}

/**
 * Add suggestions to a deduplicated map, preferring suggestions with snippets over plain text.
 * Filters out deprecated step types so they don't appear in autocomplete.
 */
function mapSuggestions(
  map: Map<string, monaco.languages.CompletionItem>,
  suggestions: monaco.languages.CompletionItem[]
): void {
  for (const suggestion of suggestions) {
    const key = getDeduplicationKey(suggestion);

    // Skip deprecated step types - they still work for backward compatibility
    // but we don't want to suggest them to users
    if (!isDeprecatedStepType(key)) {
      const existing = map.get(key);

      if (existing) {
        const existingHasSnippet = existing.insertTextRules === INSERT_AS_SNIPPET;
        const currentHasSnippet = suggestion.insertTextRules === INSERT_AS_SNIPPET;

        if (currentHasSnippet && !existingHasSnippet) {
          map.set(key, suggestion);
        }
      } else {
        map.set(key, suggestion);
      }
    }
  }
}

/**
 * Map a CompletionItemKind to a SuggestionCategory for the custom widget.
 */
function inferCategory(item: monaco.languages.CompletionItem): SuggestionCategory {
  const { CompletionItemKind } = monaco.languages;
  switch (item.kind) {
    case CompletionItemKind.Struct:
    case CompletionItemKind.Module:
    case CompletionItemKind.Function:
      return 'connector';
    case CompletionItemKind.Method:
    case CompletionItemKind.Keyword:
    case CompletionItemKind.Class:
    case CompletionItemKind.Constant:
    case CompletionItemKind.Event:
    case CompletionItemKind.Interface:
      return 'step';
    case CompletionItemKind.Field:
      return 'variable';
    case CompletionItemKind.Property:
      return 'param';
    case CompletionItemKind.Value:
    case CompletionItemKind.EnumMember:
      return 'value';
    default:
      return 'param';
  }
}

/**
 * Extract structured metadata from a CompletionItem's existing string fields.
 * This is a v1 approach — future versions can attach __enrichment at creation time.
 */
function enrichCompletionItem(
  item: monaco.languages.CompletionItem,
  matchType: string
): EnrichedSuggestionItem {
  const label = typeof item.label === 'string' ? item.label : item.label.label;
  const detail = typeof item.detail === 'string' ? item.detail : '';
  const doc =
    typeof item.documentation === 'string'
      ? item.documentation
      : typeof item.documentation === 'object' && item.documentation !== null
      ? item.documentation.value
      : '';

  const category = inferCategory(item);

  // Parse type info from detail field (patterns like "string", "object: description", "Built-in workflow step")
  let types: string[] = [];
  const description = doc;
  let required: boolean | null = null;
  let contextLabel: string | undefined;

  if (matchType === 'type' && (category === 'connector' || category === 'step')) {
    // Connector/step type suggestions: detail = connectorType, documentation = description
    contextLabel = 'Step Type';
    if (detail.startsWith('Built-in')) {
      types = ['step'];
    } else {
      types = ['action'];
    }
  } else if (category === 'variable') {
    // Variable suggestions: detail = "type" or "type?: description"
    // The detail contains the Zod type description (e.g., "string", "{ id: string; name: string }").
    // Don't split on colon — the type itself may contain colons for object shapes.
    // Don't show Required for variables — it's not applicable.
    contextLabel = 'Template Variable';
    if (detail) {
      // Use the full detail as the type description
      types = [detail.replace(/\?$/, '').trim()];
    }
    // Variables don't have a required/optional concept in autocomplete context
    required = null;
  } else if (category === 'param' || category === 'value') {
    // Parameter/value suggestions from JSON schema or custom properties
    contextLabel = 'Parameter';
    if (detail && detail !== 'Enum Value') {
      types = [detail];
    }
  }

  // Only show DESCRIPTION when the item genuinely has one. Falling back to
  // `detail` here duplicated the TYPE pill verbatim (Zod dumps show up in both
  // TYPE and DESCRIPTION, which was noisy and confusing). Let the details
  // panel's {description && ...} guard hide the section when there is no doc.
  const resolvedDescription = description && description !== detail ? description : '';

  return {
    label,
    insertText: typeof item.insertText === 'string' ? item.insertText : label,
    insertTextRules: item.insertTextRules,
    kind: item.kind ?? monaco.languages.CompletionItemKind.Text,
    range: item.range as monaco.IRange,
    filterText: item.filterText,
    sortText: item.sortText,
    additionalTextEdits: item.additionalTextEdits,
    preselect: item.preselect,
    command: item.command,
    types,
    required,
    description: resolvedDescription,
    category,
    contextLabel,
  };
}

export function getCompletionItemProvider(
  getState: () => WorkflowDetailState,
  getKqlServices?: () => WorkflowKqlCompletionServices,
  getPropertyHandler?: GetStepPropertyHandler
): monaco.languages.CompletionItemProvider {
  const provider: monaco.languages.CompletionItemProvider & { __providerId?: string } = {
    // Unique identifier to distinguish our provider from others
    __providerId: WORKFLOW_COMPLETION_PROVIDER_ID,
    // Trigger characters for completion:
    // '@' - variable references
    // '.' - property access within variables
    // ' ' - space, Liquid / KQL tokens
    // '|' - Liquid filters (e.g., {{ variable | filter }})
    // '{' - start of Liquid blocks (e.g., {{ ... }})
    // ':' '(' '"' "'" — also trigger automatic quick suggest for KQL inside quoted `on.condition`.
    triggerCharacters: ['@', '.', ' ', '"', "'", '(', ':', '|', '{'],
    provideCompletionItems: async (model, position, completionContext) => {
      const editorState = getState();
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

      // Incremental deduplication accumulator
      const deduplicatedMap = new Map<string, monaco.languages.CompletionItem>();

      // Inside workflow.output's with: block, show only declared output field names so the user
      // doesn't get generic YAML/JSON Schema keys; skip the YAML provider in that case.
      const shouldUseExclusiveSuggestions = isInWorkflowOutputWithBlock(
        autocompleteContext.focusedStepInfo
      );

      const matchType = autocompleteContext.lineParseResult?.matchType ?? '';
      const isInTemplateExpression =
        TEMPLATE_EXPRESSION_MATCH_TYPES.has(matchType) ||
        (matchType === 'liquid-block-keyword' && autocompleteContext.isInLiquidBlock);

      let isIncomplete = false;

      if (!shouldUseExclusiveSuggestions && !isInTemplateExpression) {
        const allYamlProviders = getAllYamlProviders();

        for (const yamlProvider of allYamlProviders) {
          if (yamlProvider.provideCompletionItems) {
            try {
              const result = await yamlProvider.provideCompletionItems(
                model,
                position,
                completionContext,
                {} as monaco.CancellationToken
              );
              if (result) {
                // Deduplicate across YAML providers only (snippet beats plain)
                mapSuggestions(deduplicatedMap, result.suggestions || []);
                if (result.incomplete) {
                  isIncomplete = true;
                }
              }
            } catch (error) {
              // Continue with other providers if one fails
            }
          }
        }
      }

      const workflowSuggestions = await getSuggestions(
        {
          ...autocompleteContext,
          model,
          position,
        },
        getKqlServices?.(),
        getPropertyHandler
      );
      // Workflow suggestions always win over YAML duplicates.
      for (const suggestion of workflowSuggestions) {
        const key = getDeduplicationKey(suggestion);
        if (!isDeprecatedStepType(key)) {
          deduplicatedMap.set(key, suggestion);
        }
      }

      let suggestions = Array.from(deduplicatedMap.values());

      if (!isInsideLoopBody(autocompleteContext)) {
        suggestions = suggestions.filter((s) => {
          const label = typeof s.label === 'string' ? s.label : s.label.label;
          const text = typeof s.insertText === 'string' ? s.insertText : '';
          return !LOOP_ONLY_STEP_TYPES.has(label) && !LOOP_ONLY_STEP_TYPES.has(text);
        });
      }

      // Enrich suggestions with structured metadata and emit to the custom
      // suggest widget via the side-channel store. Return empty to Monaco so
      // the built-in suggest widget never appears. The `modelUri` lets widget
      // subscribers filter out payloads from other editors.
      //
      // In unit tests that call `provideCompletionItems` directly with a mock
      // model, `model.uri` may be absent — skip emit and return Monaco-shaped
      // suggestions so the tests can still assert on the completion provider's
      // output.
      if (!model.uri) {
        return { suggestions, incomplete: isIncomplete };
      }

      const enrichedItems = suggestions.map((s) => enrichCompletionItem(s, matchType));
      emitSuggestions({
        modelUri: model.uri.toString(),
        items: enrichedItems,
        anchorPosition: { lineNumber: position.lineNumber, column: position.column },
        triggerKind:
          completionContext.triggerKind === monaco.languages.CompletionTriggerKind.Invoke
            ? 'manual'
            : 'auto',
      });

      return {
        suggestions: [],
        incomplete: isIncomplete,
      };
    },
  };
  return provider;
}
