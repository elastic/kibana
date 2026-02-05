/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SerializedVis } from '../../types';
import { getTransformIn } from './get_transform_in';
import type { DynamicActionsSerializedState } from '@kbn/embeddable-enhanced-plugin/public';

describe('getTransformIn', () => {
  const transformEnhancementsInMock = jest.fn().mockReturnValue({
    state: { dynamiceActions: 'transformedInValue' },
    references: [
      {
        id: '5678',
        name: 'someRef',
        type: 'testType',
      },
    ],
  });

  const transformIn = getTransformIn(transformEnhancementsInMock);

  describe('by reference', () => {
    test('should extract references', () => {
      expect(
        transformIn({
          enhancements: {
            dynamiceActions: 'originalValue',
          } as unknown as DynamicActionsSerializedState['enhancements'],
          savedObjectId: '1234',
          timeRange: { from: '15-now', to: 'now' },
          title: 'custom title',
          uiState: 'someUiState',
        })
      ).toMatchInlineSnapshot(`
        Object {
          "references": Array [
            Object {
              "id": "1234",
              "name": "savedObjectRef",
              "type": "visualization",
            },
            Object {
              "id": "5678",
              "name": "someRef",
              "type": "testType",
            },
          ],
          "state": Object {
            "enhancements": Object {
              "dynamiceActions": "transformedInValue",
            },
            "timeRange": Object {
              "from": "15-now",
              "to": "now",
            },
            "title": "custom title",
            "uiState": "someUiState",
          },
        }
      `);
    });
  });

  describe('by value', () => {
    test('should extract references', () => {
      expect(
        transformIn({
          enhancements: {
            dynamiceActions: 'originalValue',
          } as unknown as DynamicActionsSerializedState['enhancements'],
          savedVis: {
            data: {
              searchSource: {
                index: '1234',
              },
            },
          } as SerializedVis,
          timeRange: { from: '15-now', to: 'now' },
          title: 'custom title',
          uiState: 'someUiState',
        })
      ).toMatchInlineSnapshot(`
        Object {
          "references": Array [
            Object {
              "id": "1234",
              "name": "kibanaSavedObjectMeta.searchSourceJSON.index",
              "type": "index-pattern",
            },
            Object {
              "id": "5678",
              "name": "someRef",
              "type": "testType",
            },
          ],
          "state": Object {
            "enhancements": Object {
              "dynamiceActions": "transformedInValue",
            },
            "savedVis": Object {
              "data": Object {
                "searchSource": Object {
                  "index": undefined,
                  "indexRefName": "kibanaSavedObjectMeta.searchSourceJSON.index",
                },
              },
            },
            "timeRange": Object {
              "from": "15-now",
              "to": "now",
            },
            "title": "custom title",
            "uiState": "someUiState",
          },
        }
      `);
    });
  });
});
