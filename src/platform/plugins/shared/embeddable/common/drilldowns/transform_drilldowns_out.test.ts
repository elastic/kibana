/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getTransformDrilldownsOut } from './transform_drilldowns_out';

describe('transformDrilldownsOut', () => {
  test('Should transform drilldowns that use legacy trigger ids', () => {
    const transformDrilldownsOut = getTransformDrilldownsOut(() => undefined);

    const drilldowns = [
      {
        label: 'Go to URL',
        encode_url: true,
        open_in_new_tab: true,
        trigger: 'CONTEXT_MENU_TRIGGER',
        type: 'url_drilldown',
        url: 'https://www.youtube.com/watch?v=E4WlUXrJgy4',
      },
    ];
    const { drilldowns: transformedDrilldowns } = transformDrilldownsOut({ drilldowns });
    expect(transformedDrilldowns).toMatchInlineSnapshot(`
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
