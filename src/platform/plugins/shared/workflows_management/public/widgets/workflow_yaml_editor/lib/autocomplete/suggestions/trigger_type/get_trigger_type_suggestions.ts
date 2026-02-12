/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '@kbn/monaco';
import { AlertRuleTriggerSchema } from '@kbn/workflows/spec/schema/triggers/alert_trigger_schema';
import { ManualTriggerSchema } from '@kbn/workflows/spec/schema/triggers/manual_trigger_schema';
import { ScheduledTriggerSchema } from '@kbn/workflows/spec/schema/triggers/scheduled_trigger_schema';
import type { TriggerType } from '@kbn/workflows/spec/schema/triggers/trigger_schema';
import { generateTriggerSnippet } from '../../../snippets/generate_trigger_snippet';

/**
 * Get trigger type suggestions with snippets
 */
export function getTriggerTypeSuggestions(
  typePrefix: string,
  range: monaco.IRange
): monaco.languages.CompletionItem[] {
  const suggestions: monaco.languages.CompletionItem[] = [];

  // Get built-in trigger types from the schema (single source of truth)
  const builtInTriggerTypes = getBuiltInTriggerTypesFromSchema();

  // Filter trigger types that match the prefix
  const matchingTriggerTypes =
    typePrefix.length > 0
      ? builtInTriggerTypes.filter((triggerType) =>
          triggerType.type.toLowerCase().includes(typePrefix.toLowerCase().trim())
        )
      : builtInTriggerTypes;

  matchingTriggerTypes.forEach((triggerType) => {
    const snippetText = generateTriggerSnippet(triggerType.type as TriggerType);

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
  const triggerSchemas = [
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

  const triggerTypes = triggerSchemas.map(({ schema, description, icon }) => {
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
