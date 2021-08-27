/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { typeRegistryMock } from '../../saved_objects_type_registry.mock';
import { SavedObject } from '../../types';
import { extractErrors } from './extract_errors';
import { SavedObjectsErrorHelpers } from '../../service';
import { CreatedObject } from '../types';

describe('extractErrors()', () => {
  const namespace = 'foo-ns';
  let typeRegistry: ReturnType<typeof typeRegistryMock.create>;

  beforeEach(() => {
    typeRegistry = typeRegistryMock.create();
    typeRegistry.isSingleNamespace.mockImplementation((type) => {
      return type !== 'multiple';
    });
  });

  test('returns empty array when no errors exist', () => {
    const savedObjects: SavedObject[] = [];
    const result = extractErrors(savedObjects, savedObjects, typeRegistry, namespace);
    expect(result).toEqual([]);
  });

  test('extracts errors from saved objects', () => {
    const savedObjects: Array<CreatedObject<unknown>> = [
      {
        id: '1',
        type: 'dashboard',
        attributes: { title: 'My Dashboard 1' },
        references: [],
      },
      {
        id: '2',
        type: 'dashboard',
        attributes: { title: 'My Dashboard 2' },
        references: [],
        error: SavedObjectsErrorHelpers.createConflictError('dashboard', '2').output.payload,
      },
      {
        id: '3',
        type: 'dashboard',
        attributes: { title: 'My Dashboard 3' },
        references: [],
        error: SavedObjectsErrorHelpers.createBadRequestError().output.payload,
      },
      {
        id: '4',
        type: 'dashboard',
        attributes: { title: 'My Dashboard 4' },
        references: [],
        error: SavedObjectsErrorHelpers.createConflictError('dashboard', '4').output.payload,
        destinationId: 'foo',
      },
    ];
    const result = extractErrors(savedObjects, savedObjects, typeRegistry, namespace);
    expect(result).toEqual([
      {
        type: 'dashboard',
        id: '2',
        error: {
          type: 'conflict',
        },

        meta: {
          title: 'My Dashboard 2',
        },
        title: 'My Dashboard 2',
      },
      {
        type: 'dashboard',
        id: '3',
        error: {
          error: 'Bad Request',
          message: 'Bad Request',
          statusCode: 400,
          type: 'unknown',
        },

        meta: {
          title: 'My Dashboard 3',
        },
        title: 'My Dashboard 3',
      },
      {
        type: 'dashboard',
        id: '4',
        error: {
          destinationId: 'foo',
          type: 'conflict',
        },

        meta: {
          title: 'My Dashboard 4',
        },
        title: 'My Dashboard 4',
      },
    ]);
  });
});
