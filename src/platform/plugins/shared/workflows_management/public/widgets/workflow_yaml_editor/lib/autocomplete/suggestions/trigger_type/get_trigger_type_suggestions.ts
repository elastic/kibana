/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '@kbn/monaco';
import {
  AlertRuleTriggerSchema,
  ManualTriggerSchema,
  ScheduledTriggerSchema,
} from '@kbn/workflows';
import { triggerSchemas } from '../../../../../../trigger_schemas';
import { generateTriggerSnippet } from '../../../snippets/generate_trigger_snippet';

/** Shape used for both built-in and registered trigger suggestions */
interface TriggerSuggestionItem {
  type: string;
  description: string;
  icon: monaco.languages.CompletionItemKind;
}

/**
 * Get trigger type suggestions with snippets (built-in + registered from workflows_extensions).
 */
export function getTriggerTypeSuggestions(
  typePrefix: string,
  range: monaco.IRange
): monaco.languages.CompletionItem[] {
  const suggestions: monaco.languages.CompletionItem[] = [];

  const builtInTriggerTypes = getBuiltInTriggerTypesFromSchema();
  const registeredTriggers = triggerSchemas.getTriggerDefinitions().map(
    (t): TriggerSuggestionItem => ({
      type: t.id,
      description: t.description ?? t.title ?? t.id,
      icon: monaco.languages.CompletionItemKind.TypeParameter,
    })
  );
  const allTriggerTypes: TriggerSuggestionItem[] = [...builtInTriggerTypes, ...registeredTriggers];

  const matchingTriggerTypes =
    typePrefix.length > 0
      ? allTriggerTypes.filter((triggerType) =>
          triggerType.type.toLowerCase().includes(typePrefix.toLowerCase().trim())
        )
      : allTriggerTypes;

  matchingTriggerTypes.forEach((triggerType) => {
    const snippetText = generateTriggerSnippet(triggerType.type);

    // Extended range for multi-line insertion
    const extendedRange = {
      startLineNumber: range.startLineNumber,
      endLineNumber: range.endLineNumber,
      startColumn: range.startColumn,
      endColumn: Math.max(range.endColumn, 1000),
    };

    suggestions.push({
      label: triggerType.type,
      kind: triggerType.icon,
      insertText: snippetText,
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range: extendedRange,
      documentation: triggerType.description,
      filterText: triggerType.type,
      sortText: `!${triggerType.type}`, // Priority prefix to sort before other suggestions
      detail: 'Workflow trigger',
      preselect: false,
    });
  });

  return suggestions;
}

/**
 * Get all trigger types (built-in + registered) for tests and other callers.
 */
export function getAllTriggerTypesForSuggestions(): TriggerSuggestionItem[] {
  const builtIn = getBuiltInTriggerTypesFromSchema();
  const registered = triggerSchemas.getTriggerDefinitions().map(
    (t): TriggerSuggestionItem => ({
      type: t.id,
      description: t.description ?? t.title ?? t.id,
      icon: monaco.languages.CompletionItemKind.TypeParameter,
    })
  );
  return [...builtIn, ...registered];
}

// Cache for built-in trigger types extracted from schema
let builtInTriggerTypesCache: Array<{
  type: string;
  description: string;
  icon: monaco.languages.CompletionItemKind;
}> | null = null;

/**
 * Extract built-in trigger types from the workflow schema (single source of truth)
 */
export function getBuiltInTriggerTypesFromSchema(): Array<{
  type: string;
  description: string;
  icon: monaco.languages.CompletionItemKind;
}> {
  if (builtInTriggerTypesCache !== null) {
    return builtInTriggerTypesCache;
  }

  // Extract trigger types from the actual schema definitions
  const builtInSchemaConfigs = [
    {
      schema: AlertRuleTriggerSchema,
      description: 'Trigger workflow when an alert rule fires',
      icon: monaco.languages.CompletionItemKind.Customcolor, // Alert/event icon
    },
    {
      schema: ScheduledTriggerSchema,
      description: 'Trigger workflow on a schedule (cron or interval)',
      icon: monaco.languages.CompletionItemKind.Operator, // Schedule/operator icon
    },
    {
      schema: ManualTriggerSchema,
      description: 'Trigger workflow manually',
      icon: monaco.languages.CompletionItemKind.TypeParameter, // Manual/keyword icon
    },
  ];

  const triggerTypes = builtInSchemaConfigs.map(({ schema, description, icon }) => {
    // Extract the literal type value from the Zod schema
    const typeField = schema.shape.type;
    const triggerType = typeField.def.values[0] as string; // Get the literal value from z.literal()

    return {
      type: triggerType,
      description,
      icon,
    };
  });

  builtInTriggerTypesCache = triggerTypes;
  return triggerTypes;
}
