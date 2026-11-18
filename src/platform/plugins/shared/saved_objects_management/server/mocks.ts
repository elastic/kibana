/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObject, SavedObjectReference } from '@kbn/core/server';
import type {
  ApiBodyEntry,
  SavedObjectsManagementPluginSetup,
  SavedObjectsManagementPluginStart,
} from './types';

const createSetupContract = (): jest.Mocked<SavedObjectsManagementPluginSetup> => ({
  registerApiBodyEntry: jest.fn(),
});

const createStartContract = (): jest.Mocked<SavedObjectsManagementPluginStart> => ({
  getApiBodyEntry: jest.fn(),
  exportReferencedObjects: jest.fn(),
  importReferencedObjects: jest.fn(),
});

export const savedObjectsManagementPluginMock = {
  createSetupContract,
  createStartContract,
};

const byName = (references: SavedObjectReference[]) =>
  [...references].sort((a, b) => a.name.localeCompare(b.name));

// Parses JSON-string attributes (such as `panelsJSON`) so that key order and spacing don't count as differences.
const parseJsonStrings = (value: unknown): unknown => {
  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value);
      return typeof parsed === 'object' && parsed !== null ? parseJsonStrings(parsed) : value;
    } catch {
      return value;
    }
  }
  if (Array.isArray(value)) return value.map(parseJsonStrings);
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, parseJsonStrings(entry)])
    );
  }
  return value;
};

/** Asserts a stored fixture round-trips through the entry: `toApi`, the schema, then `toStored`; returns the body. */
export const expectApiBodyEntryRoundTrip = <Body extends object, Attributes>(
  entry: ApiBodyEntry<Body, Attributes>,
  stored: Pick<SavedObject<Attributes>, 'attributes' | 'references'>
): Body => {
  const { body, warnings } = entry.toApi(stored);
  expect(warnings).toEqual([]);

  const { error } = entry.getSchema().safeParse(body);
  expect(error?.issues ?? []).toEqual([]);

  const { attributes, references } = entry.toStored(body);
  expect(byName(references)).toEqual(byName(stored.references));
  expect(parseJsonStrings(attributes)).toEqual(parseJsonStrings(stored.attributes));

  return body;
};
