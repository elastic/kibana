/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IRouter } from '@kbn/core/server';
import { createSHA256Hash } from '@kbn/crypto';
import { stableStringify } from '@kbn/std';
import { z } from '@kbn/zod/v4';
import type { TriggerDocMetadata } from '../../common';
import type { TriggerRegistry } from '../trigger_registry';

const ROUTE_PATH = '/internal/workflows_extensions/trigger_definitions';

function eventSchemaToJsonSchema(eventSchema: z.ZodType): Record<string, unknown> | null {
  try {
    return z.toJSONSchema(eventSchema) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function hashJsonSchema(schema: Record<string, unknown>): string {
  return createSHA256Hash(stableStringify(schema));
}

/** One event payload property for docs (required/optional, type, optional description). */
export interface EventPayloadProperty {
  name: string;
  required: boolean;
  type: string;
  description?: string;
}

/** Base properties present on every trigger event (prepended to the event payload table in docs). */
const BASE_EVENT_PAYLOAD_PROPERTIES: EventPayloadProperty[] = [
  {
    name: 'timestamp',
    required: true,
    type: 'string',
    description: 'When the event occurred (ISO 8601 format).',
  },
  {
    name: 'spaceId',
    required: true,
    type: 'string',
    description: 'The Kibana space where the event was emitted.',
  },
];

function getJsonSchemaType(prop: Record<string, unknown>): string {
  if (typeof prop.type === 'string') {
    return prop.type;
  }
  const anyOf = prop.anyOf as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(anyOf)) {
    const first = anyOf.find((s) => s.type !== 'null');
    return first && typeof first.type === 'string' ? first.type : 'unknown';
  }
  const oneOf = prop.oneOf as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(oneOf)) {
    const first = oneOf.find((s) => s.type !== 'null');
    return first && typeof first.type === 'string' ? first.type : 'unknown';
  }
  return 'unknown';
}

function jsonSchemaToEventPayload(
  jsonSchema: Record<string, unknown>
): EventPayloadProperty[] | null {
  const properties = jsonSchema.properties as Record<string, Record<string, unknown>> | undefined;
  if (typeof properties !== 'object' || properties === null) {
    return null;
  }
  const required = new Set<string>(
    Array.isArray(jsonSchema.required) ? (jsonSchema.required as string[]) : []
  );
  const schemaProperties = Object.entries(properties).map(([name, prop]) => {
    const propObj = typeof prop === 'object' && prop !== null ? prop : {};
    return {
      name,
      required: required.has(name),
      type: getJsonSchemaType(propObj),
      description:
        typeof propObj.description === 'string' ? (propObj.description as string) : undefined,
    };
  });
  const combined = [...BASE_EVENT_PAYLOAD_PROPERTIES, ...schemaProperties];
  return combined.sort((a, b) => a.name.localeCompare(b.name, 'en'));
}

/**
 * Response shape for one trigger: id and schemaHash (for approval tests), plus optional doc metadata (for docs generator).
 */
export interface TriggerDefinitionResponseItem {
  id: string;
  schemaHash: string;
  title?: string;
  description?: string;
  documentation?: TriggerDocMetadata['documentation'];
  snippets?: TriggerDocMetadata['snippets'];
  eventPayload?: EventPayloadProperty[];
}

/**
 * Registers the route to get all registered trigger definitions.
 * Used by Scout tests (id + schemaHash) and by the docs generator (id, schemaHash, title, description, documentation, snippets when pushed by the public plugin).
 */
export function registerGetTriggerDefinitionsRoute(
  router: IRouter,
  registry: TriggerRegistry,
  docMetadataStore: Map<string, TriggerDocMetadata>
): void {
  router.get(
    {
      path: ROUTE_PATH,
      options: {
        access: 'internal',
      },
      security: {
        authz: {
          enabled: false,
          reason: 'This route is used for testing purposes only. No sensitive data is exposed.',
        },
      },
      validate: false,
    },
    async (_context, _request, response) => {
      const triggers: TriggerDefinitionResponseItem[] = registry
        .list()
        .map((t) => {
          const jsonSchema = eventSchemaToJsonSchema(t.eventSchema);
          const schemaHash = jsonSchema !== null ? hashJsonSchema(jsonSchema) : '';
          const doc = docMetadataStore.get(t.id);
          const item: TriggerDefinitionResponseItem = { id: t.id, schemaHash };
          if (doc) {
            item.title = doc.title;
            item.description = doc.description;
            if (doc.documentation) item.documentation = doc.documentation;
            if (doc.snippets) item.snippets = doc.snippets;
          }
          if (jsonSchema !== null) {
            const eventPayload = jsonSchemaToEventPayload(jsonSchema);
            if (eventPayload !== null && eventPayload.length > 0) {
              item.eventPayload = eventPayload;
            }
          }
          return item;
        })
        .sort((a, b) => a.id.localeCompare(b.id));

      return response.ok({ body: { triggers } });
    }
  );
}
