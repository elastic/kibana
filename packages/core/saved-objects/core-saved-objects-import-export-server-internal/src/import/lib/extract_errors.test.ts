/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  type SavedObject,
  type CreatedObject,
  SavedObjectsErrorHelpers,
} from '@kbn/core-saved-objects-server';
import { extractErrors } from './extract_errors';
import {
  LEGACY_URL_ALIAS_TYPE,
  LegacyUrlAlias,
} from '@kbn/core-saved-objects-base-server-internal';

describe('extractErrors()', () => {
  test('returns empty array when no errors exist', () => {
    const savedObjects: SavedObject[] = [];
    const result = extractErrors(savedObjects, savedObjects, [], new Map());
    expect(result).toMatchInlineSnapshot(`Array []`);
  });

  test('extracts errors from saved objects', () => {
    const savedObjects: Array<CreatedObject<unknown>> = [
      {
        id: '1',
        type: 'dashboard',
        attributes: { title: 'My Dashboard 1' },
        references: [],
        managed: false,
      },
      {
        id: '2',
        type: 'dashboard',
        attributes: { title: 'My Dashboard 2' },
        references: [],
        error: SavedObjectsErrorHelpers.createConflictError('dashboard', '2').output.payload,
        managed: false,
      },
      {
        id: '3',
        type: 'dashboard',
        attributes: { title: 'My Dashboard 3' },
        references: [],
        error: SavedObjectsErrorHelpers.createBadRequestError().output.payload,
        managed: false,
      },
      {
        id: '4',
        type: 'dashboard',
        attributes: { title: 'My Dashboard 4' },
        references: [],
        error: SavedObjectsErrorHelpers.createConflictError('dashboard', '4').output.payload,
        destinationId: 'foo',
        managed: false,
      },
    ];
    const result = extractErrors(savedObjects, savedObjects, [], new Map());
    expect(result).toMatchInlineSnapshot(`
      Array [
        Object {
          "error": Object {
            "type": "conflict",
          },
          "id": "2",
          "managed": false,
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
          "managed": false,
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
          "managed": false,
          "meta": Object {
            "title": "My Dashboard 4",
          },
          "type": "dashboard",
        },
      ]
    `);
  });

  test('extracts errors from legacy URL alias saved objects', () => {
    const savedObjects: Array<CreatedObject<unknown>> = [
      {
        id: '1',
        type: 'dashboard',
        attributes: { title: 'My Dashboard 1' },
        references: [],
        destinationId: 'one',
        managed: false,
      },
      {
        id: '2',
        type: 'dashboard',
        attributes: { title: 'My Dashboard 2' },
        references: [],
        error: SavedObjectsErrorHelpers.createConflictError('dashboard', '2').output.payload,
        managed: false,
      },
      {
        id: '3',
        type: 'dashboard',
        attributes: { title: 'My Dashboard 3' },
        references: [],
        destinationId: 'three',
        managed: false,
      },
    ];

    const legacyUrlAliasSavedObjects = new Map<string, SavedObject<LegacyUrlAlias>>([
      [
        'default:dashboard:1',
        {
          type: LEGACY_URL_ALIAS_TYPE,
          id: 'default:dashboard:1',
          attributes: {
            sourceId: '1',
            targetNamespace: 'default',
            targetType: 'dashboard',
            targetId: 'one',
            purpose: 'savedObjectImport',
          },
          references: [],
          managed: false,
        },
      ],
      [
        'default:dashboard:3',
        {
          type: LEGACY_URL_ALIAS_TYPE,
          id: 'default:dashboard:3',
          attributes: {
            sourceId: '3',
            targetNamespace: 'default',
            targetType: 'dashboard',
            targetId: 'three',
            purpose: 'savedObjectImport',
          },
          references: [],
          managed: false,
        },
      ],
    ]);
    const legacyUrlAliasResults = [
      { type: LEGACY_URL_ALIAS_TYPE, id: 'default:dashboard:1', attributes: {}, references: [] },
      {
        type: LEGACY_URL_ALIAS_TYPE,
        id: 'default:dashboard:3',
        attributes: {},
        references: [],
        error: SavedObjectsErrorHelpers.createConflictError('dashboard', '3').output.payload,
      },
    ];
    const result = extractErrors(
      savedObjects,
      savedObjects,
      legacyUrlAliasResults,
      legacyUrlAliasSavedObjects
    );
    expect(result).toMatchInlineSnapshot(`
      Array [
        Object {
          "error": Object {
            "type": "conflict",
          },
          "id": "2",
          "managed": false,
          "meta": Object {
            "title": "My Dashboard 2",
          },
          "type": "dashboard",
        },
        Object {
          "error": Object {
            "error": "Conflict",
            "message": "Saved object [dashboard/3] conflict",
            "statusCode": 409,
            "type": "unknown",
          },
          "id": "default:dashboard:3",
          "managed": false,
          "meta": Object {
            "title": "Legacy URL alias (3 -> three)",
          },
          "type": "legacy-url-alias",
        },
      ]
    `);
  });
});
