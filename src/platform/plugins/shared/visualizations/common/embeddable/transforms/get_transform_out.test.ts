/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DynamicActionsSerializedState } from '@kbn/embeddable-enhanced-plugin/public';
import { getTransformOut } from './get_transform_out';
import type { StoredVis } from './types';

describe('getTransformOut', () => {
  const transformEnhancementsOutMock = jest
    .fn()
    .mockReturnValue({ dynamiceActions: 'transformedOutValue' });

  const transformOut = getTransformOut(transformEnhancementsOutMock);

  describe('by reference', () => {
    test('should inject references', () => {
      expect(
        transformOut(
          {
            enhancements: {
              dynamiceActions: 'originalValue',
            } as unknown as DynamicActionsSerializedState['enhancements'],
            timeRange: { from: '15-now', to: 'now' },
            title: 'custom title',
            uiState: 'someUiState',
          },
          [
            {
              id: '1234',
              name: 'savedObjectRef',
              type: 'visualization',
            },
            {
              id: '5678',
              name: 'someRef',
              type: 'testType',
            },
          ]
        )
      ).toMatchInlineSnapshot(`
        Object {
          "enhancements": Object {
            "dynamiceActions": "transformedOutValue",
          },
          "savedObjectId": "1234",
          "timeRange": Object {
            "from": "15-now",
            "to": "now",
          },
          "title": "custom title",
          "uiState": "someUiState",
        }
      `);
    });
  });

  describe('by value', () => {
    test('should inject references', () => {
      expect(
        transformOut(
          {
            enhancements: {
              dynamiceActions: 'originalValue',
            } as unknown as DynamicActionsSerializedState['enhancements'],
            savedVis: {
              data: {
                searchSource: {
                  indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index',
                },
              },
            } as StoredVis,
            timeRange: { from: '15-now', to: 'now' },
            title: 'custom title',
          },
          [
            {
              id: '1234',
              name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
              type: 'index-pattern',
            },
            {
              id: '5678',
              name: 'someRef',
              type: 'testType',
            },
          ]
        )
      ).toMatchInlineSnapshot(`
        Object {
          "enhancements": Object {
            "dynamiceActions": "transformedOutValue",
          },
          "savedVis": Object {
            "data": Object {
              "searchSource": Object {
                "index": "1234",
              },
            },
          },
          "timeRange": Object {
            "from": "15-now",
            "to": "now",
          },
          "title": "custom title",
        }
      `);
    });
  });
});
