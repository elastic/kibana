/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getTransformOut } from './get_transform_out';
import type { StoredVis } from './types';

describe('getTransformOut', () => {
  const storedDrilldown = {
    dashboardRefName: 'someRef',
    type: 'dashboard_drilldown',
    label: 'Go to dashboard',
    trigger: 'some_trigger',
  };
  const drilldownReference = {
    id: '5678',
    name: 'someRef',
    type: 'dashboard',
  };

  const transformEnhancementsOutMock = jest.fn((state, references) => {
    const { dashboardRefName, ...restOfDrilldown } = storedDrilldown;
    return {
      ...state,
      drilldowns: [
        {
          ...restOfDrilldown,
          // hardcoding reference injection
          // production code would get id from reference matching dashboardRefName
          dashboard_id: 'someRef',
        },
      ],
    };
  });

  const transformOut = getTransformOut(transformEnhancementsOutMock);

  describe('by reference', () => {
    test('should inject references', () => {
      expect(
        transformOut(
          {
            drilldowns: [storedDrilldown],
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
            drilldownReference,
          ]
        )
      ).toMatchInlineSnapshot(`
        Object {
          "drilldowns": Array [
            Object {
              "dashboard_id": "someRef",
              "label": "Go to dashboard",
              "trigger": "some_trigger",
              "type": "dashboard_drilldown",
            },
          ],
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
            drilldowns: [storedDrilldown],
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
            drilldownReference,
          ]
        )
      ).toMatchInlineSnapshot(`
        Object {
          "drilldowns": Array [
            Object {
              "dashboard_id": "someRef",
              "label": "Go to dashboard",
              "trigger": "some_trigger",
              "type": "dashboard_drilldown",
            },
          ],
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
