/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { SavedObject } from '../types';
import { extractErrors } from './extract_errors';
import { SavedObjectsErrorHelpers } from '..';
import { CreatedObject } from './types';

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
    "title": "My Dashboard 2",
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
    "title": "My Dashboard 3",
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
    "title": "My Dashboard 4",
    "type": "dashboard",
  },
]
`);
  });
});
