/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { panelBwc, transformPanelReferencesOut } from './panel_bwc';

describe('transformPanelReferencesOut', () => {
  test('Should transform panelRefName reference name', () => {
    const containerReferences = [
      {
        name: 'panel_0',
        id: '1234',
        type: 'links',
      },
    ];
    expect(transformPanelReferencesOut(containerReferences, 'panel_0')).toMatchInlineSnapshot(`
      Array [
        Object {
          "id": "1234",
          "name": "savedObjectRef",
          "type": "links",
        },
      ]
    `);
  });
});

describe('panelBwc', () => {
  test('Should transform drilldowns that use legacy trigger ids', () => {
    const panel = {
      type: 'foo',
      title: 'Test panel',
      gridData: {
        y: 0,
        x: 0,
        w: 24,
        h: 7,
        i: '1',
      },
      panelIndex: '1',
      embeddableConfig: {
        attributes: {
          title: 'Test panel',
        },
        drilldowns: [
          {
            label: 'Go to URL',
            encode_url: true,
            open_in_new_tab: true,
            trigger: 'CONTEXT_MENU_TRIGGER',
            type: 'url_drilldown',
            url: 'https://www.youtube.com/watch?v=E4WlUXrJgy4',
          },
        ],
      },
    };
    const { panel: transformedPanel } = panelBwc(panel, []);
    expect(transformedPanel.embeddableConfig.drilldowns).toMatchInlineSnapshot(`
      Array [
        Object {
          "encode_url": true,
          "label": "Go to URL",
          "open_in_new_tab": true,
          "trigger": "on_open_panel_menu",
          "type": "url_drilldown",
          "url": "https://www.youtube.com/watch?v=E4WlUXrJgy4",
        },
      ]
    `);
  });
});
