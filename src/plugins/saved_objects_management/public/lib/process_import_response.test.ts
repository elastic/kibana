/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  SavedObjectsImportConflictError,
  SavedObjectsImportAmbiguousConflictError,
  SavedObjectsImportUnknownError,
  SavedObjectsImportMissingReferencesError,
  SavedObjectsImportResponse,
} from '@kbn/core/public';
import { processImportResponse } from './process_import_response';

describe('processImportResponse()', () => {
  test('works when no errors exist in the response', () => {
    const response: SavedObjectsImportResponse = {
      success: true,
      successCount: 0,
      warnings: [],
    };
    const result = processImportResponse(response);
    expect(result.status).toBe('success');
    expect(result.importCount).toBe(0);
  });

  test('conflict errors get added to failedImports and result in idle status', () => {
    const response: SavedObjectsImportResponse = {
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
      warnings: [],
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
    const response: SavedObjectsImportResponse = {
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
      warnings: [],
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
    const response: SavedObjectsImportResponse = {
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
      warnings: [],
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
    const response: SavedObjectsImportResponse = {
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
      warnings: [],
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
    const response: SavedObjectsImportResponse = {
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
      warnings: [],
    };
    const result = processImportResponse(response);
    expect(result.unmatchedReferences).toEqual([
      expect.objectContaining({ existingIndexPatternId: '2' }),
      expect.objectContaining({ existingIndexPatternId: '3' }),
    ]);
  });

  test('success results get added to successfulImports and result in success status', () => {
    const response: SavedObjectsImportResponse = {
      success: true,
      successCount: 1,
      successResults: [{ type: 'a', id: '1', meta: {} }],
      warnings: [],
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

  test('warnings from the response get returned', () => {
    const response: SavedObjectsImportResponse = {
      success: true,
      successCount: 1,
      successResults: [{ type: 'a', id: '1', meta: {} }],
      warnings: [
        {
          type: 'action_required',
          message: 'foo',
          actionPath: '/somewhere',
        },
      ],
    };
    const result = processImportResponse(response);
    expect(result.status).toBe('success');
    expect(result.importWarnings).toEqual(response.warnings);
  });
});
