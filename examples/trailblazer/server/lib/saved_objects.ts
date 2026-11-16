/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  ISavedObjectTypeRegistry,
  RequestHandlerContext,
  SavedObject,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { SavedObjectsUtils } from '@kbn/core/server';
import type { SavedObjectSummary } from '../../common/saved_objects';

const SENSITIVE_KEY = /^(api_?key|secrets?|password|.*token)$/i;
const REDACTED = '[redacted]';
const TITLE_ATTRIBUTES = ['title', 'name', 'taskType'] as const;

export interface SavedObjectsAccess {
  readonly client: SavedObjectsClientContract;
  readonly typeRegistry: ISavedObjectTypeRegistry;
  readonly typeNames: string[];
}

/** Returns a saved objects client for the current user that can also read hidden types. */
export async function getSavedObjectsAccess(
  context: RequestHandlerContext
): Promise<SavedObjectsAccess> {
  const { savedObjects } = await context.core;
  const { typeRegistry } = savedObjects;
  const types = typeRegistry.getAllTypes();
  const client = savedObjects.getClient({
    includedHiddenTypes: types.filter(({ hidden }) => hidden).map(({ name }) => name),
  });
  return { client, typeRegistry, typeNames: types.map(({ name }) => name) };
}

/** Converts a space id (as stored in the event log and alerts) into a saved objects namespace option. */
export function toNamespace(space: string | undefined): string | undefined {
  return space ? SavedObjectsUtils.namespaceStringToId(space) : undefined;
}

export function getTitle(
  typeRegistry: ISavedObjectTypeRegistry,
  object: SavedObject<unknown>
): string | undefined {
  const title = typeRegistry.getType(object.type)?.management?.getTitle?.(object);
  if (title) return title;
  const { attributes } = object;
  if (attributes === null || typeof attributes !== 'object') return undefined;
  const values = new Map(Object.entries(attributes));
  for (const key of TITLE_ATTRIBUTES) {
    const value = values.get(key);
    if (typeof value === 'string' && value) return value;
  }
  return undefined;
}

export function toSummary(
  typeRegistry: ISavedObjectTypeRegistry,
  object: SavedObject<unknown>
): SavedObjectSummary {
  return {
    type: object.type,
    id: object.id,
    title: getTitle(typeRegistry, object),
    spaces: object.namespaces ?? [],
    updatedAt: object.updated_at,
  };
}

/** Replaces values of credential-like keys; encrypted attributes are already stripped by core. */
export function redactAttributes(attributes: unknown): Record<string, unknown> {
  if (attributes === null || typeof attributes !== 'object' || Array.isArray(attributes)) return {};
  return Object.fromEntries(
    Object.entries(attributes).map(([key, value]) => [
      key,
      SENSITIVE_KEY.test(key) ? REDACTED : redactValue(value),
    ])
  );
}

function redactValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactValue);
  if (value !== null && typeof value === 'object') return redactAttributes(value);
  return value;
}
