/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  SavedObjectsClientContract,
  SimpleSavedObject,
} from '@kbn/core-saved-objects-api-browser';
import type { SavedObject } from '@kbn/core-saved-objects-common';

type T = unknown;
const createSimpleSavedObjectMock = (
  savedObject: SavedObject
): jest.Mocked<SimpleSavedObject<T>> => {
  const mock = {
    attributes: savedObject.attributes || ({} as T),
    _version: savedObject.version ?? '',
    id: savedObject.id ?? 'id',
    type: savedObject.type ?? 'type',
    migrationVersion: savedObject.migrationVersion ?? {},
    coreMigrationVersion: savedObject.coreMigrationVersion ?? '8.0.0',
    error: undefined,
    references: savedObject.references ?? [],
    updatedAt: savedObject.updated_at ?? '',
    namespaces: savedObject.namespaces ?? undefined,
    get: jest.fn(),
    set: jest.fn(),
    has: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };
  mock.get.mockImplementation(
    (key: string): any => (savedObject.attributes as any)[key] || undefined
  );
  mock.set.mockReturnValue((key: string, value: any) => {
    (savedObject as any)[key] = value;
    return savedObject;
  });
  mock.has.mockReturnValue(true);
  mock.save.mockImplementation(() => Promise.resolve(mock));
  mock.delete.mockImplementation(() => Promise.resolve({}));
  return mock;
};

export const simpleSavedObjectMock = {
  create: (client: SavedObjectsClientContract, savedObject: SavedObject) =>
    createSimpleSavedObjectMock(savedObject),
};
