/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObject } from '../../types';
import { extractErrors } from './extract_errors';
import { SavedObjectsErrorHelpers } from '../../service';
import { CreatedObject } from '../types';

describe('extractErrors()', () => {
  test('returns empty array when no errors exist', () => {
    const savedObjects: SavedObject[] = [];
    const result = extractErrors(savedObjects, savedObjects);
    expect(result).toMatchInlineSnapshot(`Array []`);
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
    const result = extractErrors(savedObjects, savedObjects);
    expect(result).toMatchInlineSnapshot(`
      Array [
        Object {
          "error": Object {
            "type": "conflict",
          },
          "id": "2",
          "meta": Object {
            "title": "My Dashboard 2",
          },
          "type": "dashboard",
        },
        Object {
          "error": Object {
            "error": "Bad Request",
            "message": "Bad Request",
            "statusCode": 400,
            "type": "unknown",
          },
          "id": "3",
          "meta": Object {
            "title": "My Dashboard 3",
          },
          "type": "dashboard",
        },
        Object {
          "error": Object {
            "destinationId": "foo",
            "type": "conflict",
          },
          "id": "4",
          "meta": Object {
            "title": "My Dashboard 4",
          },
          "type": "dashboard",
        },
      ]
    `);
  });
});
