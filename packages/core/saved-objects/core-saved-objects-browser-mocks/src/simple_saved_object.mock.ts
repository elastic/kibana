/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// import type { MockedKeys } from '@kbn/utility-types-jest';
import type {
  SavedObjectsClientContract,
  SimpleSavedObject,
} from '@kbn/core-saved-objects-api-browser';
import { SimpleSavedObjectImpl } from '@kbn/core-saved-objects-browser-internal';

// const simpleSavedObjectInstanceMock: MockedKeys<SimpleSavedObject> = {
//   attributes: {},
//   id: '',
//   type: '',
//   migrationVersion: {},
//   coreMigrationVersion: '',
//   error: undefined,
//   references: [],
//   updatedAt: '',
//   namespaces: undefined,
//   get: jest.fn().mockReturnThis(),
//   set: jest.fn().mockReturnThis(),
//   has: jest.fn().mockReturnValue(true),
//   save: jest.fn().mockResolvedValue({}),
//   delete: jest.fn().mockResolvedValue({}),
// };

const createSimpleSavedObjectMock = (
  client: SavedObjectsClientContract,
  savedObject: SimpleSavedObject
) => new SimpleSavedObjectImpl(client, savedObject);

export const simpleSavedObjectMock = {
  create: createSimpleSavedObjectMock,
  // createBlank: jest.fn().mockReturnValue(simpleSavedObjectInstanceMock),
};
