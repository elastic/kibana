/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { generateNewPanelIds } from './generate_new_panel_ids';

jest.mock('uuid', () => {
  let count = 0;
  return {
    v4: () => `${100 + count++}`,
  };
});

describe('generateNewPanelIds', () => {
  test('should generate new ids for panels', () => {
    const { newPanels, newPanelReferences } = generateNewPanelIds(
      [
        {
          gridData: { x: 0, y: 0, w: 6, h: 6, i: '1' },
          panelConfig: { title: 'panel One' },
          panelIndex: '1',
          type: 'testPanelType',
        },
      ],
      [
        {
          type: 'refType',
          id: 'ref1',
          name: '1:panel_1',
        },
      ]
    );

    expect(newPanels).toEqual([
      {
        gridData: { x: 0, y: 0, w: 6, h: 6, i: '100' },
        panelConfig: { title: 'panel One' },
        panelIndex: '100',
        type: 'testPanelType',
      },
    ]);

    expect(newPanelReferences).toEqual([
      {
        type: 'refType',
        id: 'ref1',
        name: '100:panel_1',
      },
    ]);
  });

  test('should generate new ids for panels with sections', () => {
    const { newPanels, newPanelReferences } = generateNewPanelIds(
      [
        {
          title: 'Section One',
          collapsed: true,
          gridData: {
            y: 6,
            i: 'section1',
          },
          panels: [
            {
              gridData: { x: 0, y: 0, w: 6, h: 6, i: '1' },
              panelConfig: { title: 'panel One' },
              panelIndex: '1',
              type: 'testPanelType',
            },
          ],
        },
      ],
      [
        {
          type: 'refType',
          id: 'ref1',
          name: '1:panel_1',
        },
      ]
    );

    expect(newPanels).toEqual([
      {
        title: 'Section One',
        collapsed: true,
        gridData: {
          y: 6,
          i: '101',
        },
        panels: [
          {
            gridData: { x: 0, y: 0, w: 6, h: 6, i: '102' },
            panelConfig: { title: 'panel One' },
            panelIndex: '102',
            type: 'testPanelType',
          },
        ],
      },
    ]);

    expect(newPanelReferences).toEqual([
      {
        type: 'refType',
        id: 'ref1',
        name: '102:panel_1',
      },
    ]);
  });
});
