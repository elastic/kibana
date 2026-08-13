/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BaseTriggerDefinition } from '@kbn/workflows';
import {
  builtInTriggerDefinitions,
  EventTimestampSchema,
  WorkflowEventsSchema,
} from '@kbn/workflows';
import { BaseEventSchema } from '@kbn/workflows/spec/schema/common/base_event';
import { AlertEventSchema } from '@kbn/workflows/spec/schema/triggers/alert_trigger_schema';
import type { ServerTriggerDefinition } from '@kbn/workflows-extensions/server';
import { z } from '@kbn/zod/v4';

const LARGE_ENUM_THRESHOLD = 20;

export interface TriggerDefinitionForAgent {
  id: string;
  label: string;
  description: string;
  jsonSchema: unknown;
  eventContextSchema: unknown;
  eventContextNote: string;
  examples?: string[];
}

export const EVENT_CONTEXT_NOTE =
  'The event context is available via {{ event.* }} in Liquid templates. ' +
  'NEVER use {{ triggers.event }} or {{ trigger.event }} — the correct variable is {{ event }}.';

function zodToJsonSchemaSafe(schema: z.ZodType): unknown {
  try {
    const jsonSchema = z.toJSONSchema(schema, { target: 'draft-7', unrepresentable: 'any' });
    return compactLargeEnums(jsonSchema as Record<string, unknown>);
  } catch {
    return undefined;
  }
}

function compactLargeEnums(node: unknown): unknown {
  if (node === null || typeof node !== 'object') return node;
  if (Array.isArray(node)) return node.map(compactLargeEnums);

  const obj = node as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (key === 'enum' && Array.isArray(value) && value.length > LARGE_ENUM_THRESHOLD) {
      const examples = value.slice(0, 5) as string[];
      result.type = 'string';
      result.description = [
        obj.description ?? '',
        `One of ${value.length} allowed values, e.g.: ${examples.join(', ')}`,
      ]
        .filter(Boolean)
        .join('. ');
    } else {
      result[key] = compactLargeEnums(value);
    }
  }

  return result;
}

function isZodObject(schema: z.ZodType): schema is z.ZodObject<z.ZodRawShape> {
  return schema instanceof z.ZodObject;
}

function getCustomTriggerYamlSchema(triggerId: string): z.ZodType {
  return z.object({
    type: z.literal(triggerId),
    on: z
      .object({
        condition: z.string().optional(),
        workflowEvents: WorkflowEventsSchema.optional(),
      })
      .optional(),
  });
}

function humanizeTriggerId(triggerId: string): string {
  const [namespace, event] = triggerId.split('.');
  const formatSegment = (segment: string) =>
    segment
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  if (!event) {
    return formatSegment(triggerId);
  }
  return `${formatSegment(namespace)} - ${formatSegment(event)}`;
}

function getEventContextSchema(
  triggerId: string,
  customDefsById: Map<string, ServerTriggerDefinition>
): unknown {
  if (triggerId === 'alert') {
    return zodToJsonSchemaSafe(AlertEventSchema);
  }

  const custom = customDefsById.get(triggerId);
  if (custom && isZodObject(custom.eventSchema)) {
    return zodToJsonSchemaSafe(
      z.object({
        ...BaseEventSchema.shape,
        ...EventTimestampSchema.shape,
        ...custom.eventSchema.shape,
      })
    );
  }

  return zodToJsonSchemaSafe(BaseEventSchema);
}

function createRegisteredTriggersMap(
  registeredTriggers: ServerTriggerDefinition[]
): Map<string, ServerTriggerDefinition> {
  return new Map(registeredTriggers.map((def) => [def.id, def]));
}

function formatBuiltInTrigger(
  def: BaseTriggerDefinition,
  registeredTriggersById: Map<string, ServerTriggerDefinition>
): TriggerDefinitionForAgent {
  return {
    id: def.id,
    label: def.label,
    description: def.description,
    jsonSchema: zodToJsonSchemaSafe(def.schema),
    eventContextSchema: getEventContextSchema(def.id, registeredTriggersById),
    eventContextNote: EVENT_CONTEXT_NOTE,
    examples: def.documentation.examples,
  };
}

function formatRegisteredTrigger(
  def: ServerTriggerDefinition,
  registeredTriggersById: Map<string, ServerTriggerDefinition>
): TriggerDefinitionForAgent {
  const formatted: TriggerDefinitionForAgent = {
    id: def.id,
    label: def.title ?? humanizeTriggerId(def.id),
    description:
      def.description ??
      `Event-driven trigger (${def.id}). Use on.condition with KQL on event.* fields to filter when the workflow runs.`,
    jsonSchema: zodToJsonSchemaSafe(getCustomTriggerYamlSchema(def.id)),
    eventContextSchema: getEventContextSchema(def.id, registeredTriggersById),
    eventContextNote: EVENT_CONTEXT_NOTE,
  };

  const examples = def.documentation?.examples;
  if (examples && examples.length > 0) {
    formatted.examples = examples;
  }

  return formatted;
}

/**
 * Full trigger catalog for workflow authoring agents.
 *
 * - Built-ins (`manual`, `scheduled`, `alert`) come from `@kbn/workflows`.
 * - Everything else comes from `api.getRegisteredTriggers()` (workflows_extensions registry).
 */
export function getAllTriggerDefinitionsForAgent(
  registeredTriggers: ServerTriggerDefinition[]
): TriggerDefinitionForAgent[] {
  const registeredById = createRegisteredTriggersMap(registeredTriggers);
  const builtInIds = new Set(builtInTriggerDefinitions.map((def) => def.id));

  const builtIn = builtInTriggerDefinitions.map((def) => formatBuiltInTrigger(def, registeredById));
  const pluginRegistered = registeredTriggers
    .filter((def) => !builtInIds.has(def.id))
    .map((def) => formatRegisteredTrigger(def, registeredById));

  return [...builtIn, ...pluginRegistered];
}

export interface TriggerDefinitionsLookupSuccess {
  count: number;
  triggerTypes: TriggerDefinitionForAgent[];
}

export interface TriggerDefinitionsLookupError {
  error: string;
  availableTypes: string[];
}

export type TriggerDefinitionsLookupResult =
  | TriggerDefinitionsLookupSuccess
  | TriggerDefinitionsLookupError;

export const isTriggerDefinitionsLookupError = (
  result: TriggerDefinitionsLookupResult
): result is TriggerDefinitionsLookupError => 'error' in result;

/**
 * Resolves the agent trigger catalog, optionally filtered to a single trigger id.
 */
export function lookupTriggerDefinitionsForAgent({
  registeredTriggers,
  triggerType,
}: {
  registeredTriggers: ServerTriggerDefinition[];
  triggerType?: string;
}): TriggerDefinitionsLookupResult {
  const allTriggerDefinitions = getAllTriggerDefinitionsForAgent(registeredTriggers);

  if (!triggerType) {
    return { count: allTriggerDefinitions.length, triggerTypes: allTriggerDefinitions };
  }

  const matching = allTriggerDefinitions.filter((def) => def.id === triggerType);
  if (matching.length === 0) {
    return {
      error: `Trigger type "${triggerType}" not found`,
      availableTypes: allTriggerDefinitions.map((def) => def.id),
    };
  }

  return { count: matching.length, triggerTypes: matching };
}
