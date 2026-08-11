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
  getBuiltInTriggerDefinition,
  isTriggerType,
  ManualTriggerSchema,
  ScheduledTriggerSchema,
} from '@kbn/workflows';
import { mapPublicTriggerToDisplay } from '../../../../../../lib/map_public_trigger_to_display';
import { triggerSchemas } from '../../../../../../trigger_schemas';
import { generateTriggerSnippet } from '../../../snippets/generate_trigger_snippet';

/** Shape used for both built-in and registered trigger suggestions */
interface TriggerSuggestionItem {
  type: string;
  label: string;
  description: string;
  icon: monaco.languages.CompletionItemKind;
}

function matchesTriggerTypePrefix(item: TriggerSuggestionItem, typePrefix: string): boolean {
  const normalizedPrefix = typePrefix.toLowerCase().trim();
  if (normalizedPrefix.length === 0) {
    return true;
  }

  const normalizedType = item.type.toLowerCase();
  const normalizedLabel = item.label.toLowerCase();

  if (normalizedPrefix.includes('.')) {
    return normalizedType.includes(normalizedPrefix);
  }

  return normalizedType.includes(normalizedPrefix) || normalizedLabel.includes(normalizedPrefix);
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
  const registeredTriggers = triggerSchemas
    .getTriggerDefinitions()
    .map((t): TriggerSuggestionItem => {
      const display = mapPublicTriggerToDisplay(t);

      return {
        type: display.id,
        label: display.label,
        description: display.documentation,
        icon: monaco.languages.CompletionItemKind.TypeParameter,
      };
    });
  const allTriggerTypes: TriggerSuggestionItem[] = [...builtInTriggerTypes, ...registeredTriggers];

  const matchingTriggerTypes = allTriggerTypes.filter((triggerType) =>
    matchesTriggerTypePrefix(triggerType, typePrefix)
  );

  matchingTriggerTypes.forEach((triggerType) => {
    const triggerDef = triggerSchemas.getTriggerDefinition(triggerType.type);
    const snippetText = generateTriggerSnippet(triggerType.type, {
      defaultCondition: triggerDef?.snippets?.condition,
    });

    // Extended range for multi-line insertion
    const extendedRange = {
      startLineNumber: range.startLineNumber,
      endLineNumber: range.endLineNumber,
      startColumn: range.startColumn,
      endColumn: Math.max(range.endColumn, 1000),
    };

    const isEventDriven = !isTriggerType(triggerType.type);
    const sortPrefix = isEventDriven ? '1_' : '0_';
    suggestions.push({
      label: triggerType.type,
      kind: triggerType.icon,
      insertText: snippetText,
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range: extendedRange,
      documentation: triggerType.description,
      filterText: triggerType.type,
      sortText: `!${sortPrefix}${triggerType.type}`,
      detail: triggerType.label,
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
  const registered = triggerSchemas.getTriggerDefinitions().map((t): TriggerSuggestionItem => {
    const display = mapPublicTriggerToDisplay(t);

    return {
      type: display.id,
      label: display.label,
      description: display.documentation,
      icon: monaco.languages.CompletionItemKind.TypeParameter,
    };
  });
  return [...builtIn, ...registered];
}

// Cache for built-in trigger types extracted from schema
let builtInTriggerTypesCache: TriggerSuggestionItem[] | null = null;

/**
 * Extract built-in trigger types from the workflow schema (single source of truth)
 */
export function getBuiltInTriggerTypesFromSchema(): TriggerSuggestionItem[] {
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
    const builtInDefinition = getBuiltInTriggerDefinition(triggerType);

    return {
      type: triggerType,
      label: builtInDefinition?.label ?? triggerType,
      description: builtInDefinition?.description ?? description,
      icon,
    };
  });

  builtInTriggerTypesCache = triggerTypes;
  return triggerTypes;
}
