/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { transformPanelReferencesOut } from './panel_bwc';

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
