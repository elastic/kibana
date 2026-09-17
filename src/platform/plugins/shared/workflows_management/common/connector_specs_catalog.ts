/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, ZodObject } from '@kbn/zod/v4';
import { fromJSONSchema } from '@kbn/zod/v4/from_json_schema';
import { stepSchemas } from './step_schemas';

export interface SerializedConnectorSpecCatalogEntry {
  id: string;
  isInboundOnly: boolean;
  actions: Record<
    string,
    {
      description?: string;
      isTool?: boolean;
      input: Record<string, unknown>;
    }
  >;
  events?: {
    definitions: Array<{
      eventId: string;
      title: string;
      description: string;
      eventSchema: Record<string, unknown>;
    }>;
  };
}

export interface RehydratedConnectorSpecAction {
  description?: string;
  isTool?: boolean;
  input: z.ZodSchema;
}

export interface RehydratedConnectorSpecEventDefinition {
  eventId: string;
  title: string;
  description: string;
  eventSchema: z.ZodObject;
}

export interface RehydratedConnectorSpecCatalogEntry {
  id: string;
  isInboundOnly: boolean;
  actions: Record<string, RehydratedConnectorSpecAction>;
  events?: { definitions: RehydratedConnectorSpecEventDefinition[] };
}

export const ConnectorSpecsInputSchemas = new Map<string, Record<string, z.ZodSchema>>();
export const inboundOnlyConnectorTypeIds = new Set<string>();

let catalogCache: RehydratedConnectorSpecCatalogEntry[] = [];
let loadPromise: Promise<RehydratedConnectorSpecCatalogEntry[]> | null = null;

const toZodObject = (jsonSchema: Record<string, unknown>): z.ZodObject => {
  const schema = fromJSONSchema(jsonSchema, { preserveMeta: true });
  if (schema instanceof ZodObject) {
    return schema;
  }
  return z.object({}).passthrough();
};

export function rehydrateConnectorSpecsCatalog(
  entries: SerializedConnectorSpecCatalogEntry[]
): RehydratedConnectorSpecCatalogEntry[] {
  return entries.map((entry) => ({
    id: entry.id,
    isInboundOnly: entry.isInboundOnly,
    actions: Object.fromEntries(
      Object.entries(entry.actions).map(([name, action]) => [
        name,
        {
          ...(action.description !== undefined ? { description: action.description } : {}),
          ...(action.isTool !== undefined ? { isTool: action.isTool } : {}),
          input: fromJSONSchema(action.input, { preserveMeta: true }) ?? z.any(),
        },
      ])
    ),
    ...(entry.events
      ? {
          events: {
            definitions: entry.events.definitions.map((definition) => ({
              eventId: definition.eventId,
              title: definition.title,
              description: definition.description,
              eventSchema: toZodObject(definition.eventSchema),
            })),
          },
        }
      : {}),
  }));
}

export function applyConnectorSpecsCatalog(entries: RehydratedConnectorSpecCatalogEntry[]): void {
  catalogCache = entries;
  ConnectorSpecsInputSchemas.clear();
  inboundOnlyConnectorTypeIds.clear();
  for (const entry of entries) {
    ConnectorSpecsInputSchemas.set(
      entry.id,
      Object.fromEntries(
        Object.entries(entry.actions).map(([name, action]) => [name, action.input])
      )
    );
    if (entry.isInboundOnly) {
      inboundOnlyConnectorTypeIds.add(entry.id);
    }
  }
  // Rebuild connector contracts after schemas change so YAML consumers see spec types.
  stepSchemas.setAllConnectorsCache(null);
  stepSchemas.setAllConnectorsMapCache(null);
}

export function getConnectorSpecsCatalog(): RehydratedConnectorSpecCatalogEntry[] {
  return catalogCache;
}

export function ensureConnectorSpecsCatalogLoaded(
  loader: () => Promise<SerializedConnectorSpecCatalogEntry[]>
): Promise<RehydratedConnectorSpecCatalogEntry[]> {
  if (!loadPromise) {
    loadPromise = loader()
      .then((entries) => {
        const rehydrated = rehydrateConnectorSpecsCatalog(entries);
        applyConnectorSpecsCatalog(rehydrated);
        return rehydrated;
      })
      .catch((error) => {
        loadPromise = null;
        throw error;
      });
  }
  return loadPromise;
}

export function resetConnectorSpecsCatalog(): void {
  catalogCache = [];
  loadPromise = null;
  ConnectorSpecsInputSchemas.clear();
  inboundOnlyConnectorTypeIds.clear();
  stepSchemas.setAllConnectorsCache(null);
  stepSchemas.setAllConnectorsMapCache(null);
}
