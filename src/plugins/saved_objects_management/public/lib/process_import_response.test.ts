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

import {
  SavedObjectsImportConflictError,
  SavedObjectsImportAmbiguousConflictError,
  SavedObjectsImportUnknownError,
  SavedObjectsImportMissingReferencesError,
} from 'src/core/public';
import { processImportResponse } from './process_import_response';

describe('processImportResponse()', () => {
  test('works when no errors exist in the response', () => {
    const response = {
      success: true,
      successCount: 0,
    };
    const result = processImportResponse(response);
    expect(result.status).toBe('success');
    expect(result.importCount).toBe(0);
  });

  test('conflict errors get added to failedImports and result in idle status', () => {
    const response = {
      success: false,
      successCount: 0,
      errors: [
        {
          type: 'a',
          id: '1',
          error: {
            type: 'conflict',
          } as SavedObjectsImportConflictError,
          meta: {},
        },
      ],
    };
    const result = processImportResponse(response);
    expect(result.failedImports).toMatchInlineSnapshot(`
      Array [
        Object {
          "error": Object {
            "type": "conflict",
          },
          "obj": Object {
            "id": "1",
            "meta": Object {},
            "type": "a",
          },
        },
      ]
    `);
    expect(result.status).toBe('idle');
  });

  test('ambiguous conflict errors get added to failedImports and result in idle status', () => {
    const response = {
      success: false,
      successCount: 0,
      errors: [
        {
          type: 'a',
          id: '1',
          error: {
            type: 'ambiguous_conflict',
          } as SavedObjectsImportAmbiguousConflictError,
          meta: {},
        },
      ],
    };
    const result = processImportResponse(response);
    expect(result.failedImports).toMatchInlineSnapshot(`
      Array [
        Object {
          "error": Object {
            "type": "ambiguous_conflict",
          },
          "obj": Object {
            "id": "1",
            "meta": Object {},
            "type": "a",
          },
        },
      ]
    `);
    expect(result.status).toBe('idle');
  });

  test('unknown errors get added to failedImports and result in success status', () => {
    const response = {
      success: false,
      successCount: 0,
      errors: [
        {
          type: 'a',
          id: '1',
          error: {
            type: 'unknown',
          } as SavedObjectsImportUnknownError,
          meta: {},
        },
      ],
    };
    const result = processImportResponse(response);
    expect(result.failedImports).toMatchInlineSnapshot(`
      Array [
        Object {
          "error": Object {
            "type": "unknown",
          },
          "obj": Object {
            "id": "1",
            "meta": Object {},
            "type": "a",
          },
        },
      ]
    `);
    expect(result.status).toBe('success');
  });

  test('missing references get added to failedImports and result in idle status', () => {
    const response = {
      success: false,
      successCount: 0,
      errors: [
        {
          type: 'a',
          id: '1',
          error: {
            type: 'missing_references',
            references: [
              {
                type: 'index-pattern',
                id: '2',
              },
            ],
          } as SavedObjectsImportMissingReferencesError,
          meta: {},
        },
      ],
    };
    const result = processImportResponse(response);
    expect(result.failedImports).toMatchInlineSnapshot(`
      Array [
        Object {
          "error": Object {
            "references": Array [
              Object {
                "id": "2",
                "type": "index-pattern",
              },
            ],
            "type": "missing_references",
          },
          "obj": Object {
            "id": "1",
            "meta": Object {},
            "type": "a",
          },
        },
      ]
    `);
    expect(result.status).toBe('idle');
  });

  test('missing references get added to unmatchedReferences, but are not duplicated', () => {
    const response = {
      success: false,
      successCount: 0,
      errors: [
        {
          type: 'a',
          id: '1',
          error: {
            type: 'missing_references',
            references: [
              { type: 'index-pattern', id: '2' },
              { type: 'index-pattern', id: '3' },
              { type: 'index-pattern', id: '2' }, // duplicate that should not show in the result's unmatchedReferences
            ],
          } as SavedObjectsImportMissingReferencesError,
          meta: {},
        },
      ],
    };
    const result = processImportResponse(response);
    expect(result.unmatchedReferences).toEqual([
      expect.objectContaining({ existingIndexPatternId: '2' }),
      expect.objectContaining({ existingIndexPatternId: '3' }),
    ]);
  });

  test('success results get added to successfulImports and result in success status', () => {
    const response = {
      success: true,
      successCount: 1,
      successResults: [{ type: 'a', id: '1', meta: {} }],
    };
    const result = processImportResponse(response);
    expect(result.successfulImports).toMatchInlineSnapshot(`
      Array [
        Object {
          "id": "1",
          "meta": Object {},
          "type": "a",
        },
      ]
    `);
    expect(result.status).toBe('success');
  });
});
