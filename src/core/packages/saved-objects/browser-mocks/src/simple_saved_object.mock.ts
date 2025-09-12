/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  SavedObjectsClientContract,
  SimpleSavedObject,
} from '@kbn/core-saved-objects-api-browser';
import type { SavedObject } from '@kbn/core-saved-objects-common';
import { lazyObject } from '@kbn/lazy-object';

type T = unknown;

const simpleSavedObjectMockDefaults: Partial<SimpleSavedObject<T>> = {
  attributes: {},
  _version: '',
  id: 'id',
  type: 'type',
  migrationVersion: {},
  coreMigrationVersion: '8.0.0',
  error: undefined,
  references: [],
  updatedAt: '',
  createdAt: '',
  namespaces: undefined,
  managed: false,
};

const createSimpleSavedObjectMock = (
  savedObject: SavedObject
): jest.Mocked<SimpleSavedObject<T>> => {
  const mock = lazyObject({
    ...simpleSavedObjectMockDefaults,
    attributes: savedObject.attributes,
    _version: savedObject.version,
    id: savedObject.id,
    type: savedObject.type,
    migrationVersion: savedObject.migrationVersion,
    coreMigrationVersion: savedObject.coreMigrationVersion,
    typeMigrationVersion: savedObject.typeMigrationVersion,
    managed: savedObject.managed,
    error: savedObject.error,
    references: savedObject.references,
    updatedAt: savedObject.updated_at,
    updatedBy: savedObject.updated_by,
    createdAt: savedObject.created_at,
    createdBy: savedObject.created_by,
    namespaces: savedObject.namespaces,
    get: jest
      .fn()
      .mockImplementation((key: string): any => (savedObject.attributes as any)[key] || undefined),
    set: jest.fn().mockReturnValue((key: string, value: any) => {
      (savedObject as any)[key] = value;
      return savedObject;
    }),
    has: jest.fn().mockReturnValue(true),
    save: jest.fn(),
    delete: jest.fn().mockImplementation(() => Promise.resolve({})),
  });

  mock.save.mockImplementation(() => Promise.resolve(mock));

  return mock;
};

/**
 * @deprecated See https://github.com/elastic/kibana/issues/149098
 */
export const simpleSavedObjectMock = {
  create: (client: SavedObjectsClientContract, savedObject: SavedObject) =>
    createSimpleSavedObjectMock(savedObject),
};
