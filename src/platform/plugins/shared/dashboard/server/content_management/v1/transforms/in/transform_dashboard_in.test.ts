/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DEFAULT_DASHBOARD_OPTIONS } from '../../../../../common/content_management';
import { DashboardAttributes } from '../../types';
import { transformDashboardIn } from './transform_dashboard_in';

describe('transformDashboardIn', () => {
  test('should transform dashboard state to saved object', async () => {
    const dashboardState: DashboardAttributes = {
      controlGroupInput: {
        chainingSystem: 'NONE',
        labelPosition: 'twoLine',
        controls: [
          {
            controlConfig: { anyKey: 'some value' },
            grow: false,
            id: 'foo',
            order: 0,
            type: 'type1',
            width: 'small',
          },
        ],
        ignoreParentSettings: {
          ignoreFilters: true,
          ignoreQuery: true,
          ignoreTimerange: true,
          ignoreValidations: true,
        },
        autoApplySelections: false,
      },
      description: 'description',
      kibanaSavedObjectMeta: { searchSource: { query: { query: 'test', language: 'KQL' } } },
      options: {
        hidePanelTitles: true,
        useMargins: false,
        syncColors: false,
        syncTooltips: false,
        syncCursor: false,
      },
      panels: [
        {
          gridData: { x: 0, y: 0, w: 10, h: 10, i: '1' },
          panelConfig: {
            enhancements: {},
            savedObjectId: '1',
          },
          panelIndex: '1',
          panelRefName: 'ref1',
          title: 'title1',
          type: 'type1',
          version: '2',
        },
      ],
      tags: [],
      timeRestore: true,
      title: 'title',
      refreshInterval: { pause: true, value: 1000 },
      timeFrom: 'now-15m',
      timeTo: 'now',
    };

    const output = await transformDashboardIn({ dashboardState });
    expect(output).toMatchInlineSnapshot(`
      Object {
        "attributes": Object {
          "controlGroupInput": Object {
            "chainingSystem": "NONE",
            "controlStyle": "twoLine",
            "ignoreParentSettingsJSON": "{\\"ignoreFilters\\":true,\\"ignoreQuery\\":true,\\"ignoreTimerange\\":true,\\"ignoreValidations\\":true}",
            "panelsJSON": "{\\"foo\\":{\\"grow\\":false,\\"order\\":0,\\"type\\":\\"type1\\",\\"width\\":\\"small\\",\\"explicitInput\\":{\\"anyKey\\":\\"some value\\"}}}",
            "showApplySelections": true,
          },
          "description": "description",
          "kibanaSavedObjectMeta": Object {
            "searchSourceJSON": "{\\"query\\":{\\"query\\":\\"test\\",\\"language\\":\\"KQL\\"}}",
          },
          "optionsJSON": "{\\"hidePanelTitles\\":true,\\"useMargins\\":false,\\"syncColors\\":false,\\"syncTooltips\\":false,\\"syncCursor\\":false}",
          "panelsJSON": "[{\\"panelRefName\\":\\"ref1\\",\\"title\\":\\"title1\\",\\"type\\":\\"type1\\",\\"version\\":\\"2\\",\\"embeddableConfig\\":{\\"enhancements\\":{},\\"savedObjectId\\":\\"1\\"},\\"panelIndex\\":\\"1\\",\\"gridData\\":{\\"x\\":0,\\"y\\":0,\\"w\\":10,\\"h\\":10,\\"i\\":\\"1\\"}}]",
          "refreshInterval": Object {
            "pause": true,
            "value": 1000,
          },
          "timeFrom": "now-15m",
          "timeRestore": true,
          "timeTo": "now",
          "title": "title",
        },
        "error": null,
        "references": Array [],
      }
    `);
  });

  it('should handle missing optional state keys', async () => {
    const dashboardState: DashboardAttributes = {
      title: 'title',
      description: 'my description',
      timeRestore: false,
      panels: [],
      options: DEFAULT_DASHBOARD_OPTIONS,
      kibanaSavedObjectMeta: {},
    };

    const output = await transformDashboardIn({ dashboardState });
    expect(output).toMatchInlineSnapshot(`
      Object {
        "attributes": Object {
          "description": "my description",
          "kibanaSavedObjectMeta": Object {
            "searchSourceJSON": "{}",
          },
          "optionsJSON": "{\\"hidePanelTitles\\":false,\\"useMargins\\":true,\\"syncColors\\":true,\\"syncCursor\\":true,\\"syncTooltips\\":true}",
          "panelsJSON": "[]",
          "timeRestore": false,
          "title": "title",
        },
        "error": null,
        "references": Array [],
      }
    `);
  });
});
