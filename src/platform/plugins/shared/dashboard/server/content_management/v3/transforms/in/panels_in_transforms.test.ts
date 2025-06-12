/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DashboardPanel } from '../../types';
import { transformPanelsIn } from './panels_in_transforms';

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid'),
}));

describe('transformPanelsIn', () => {
  it('should transform panels', () => {
    const panels = [
      {
        type: 'foo',
        panelIndex: '1',
        gridData: { x: 0, y: 0, w: 12, h: 12, i: '1' },
        panelConfig: { foo: 'bar' },
      },
      {
        type: 'bar',
        gridData: { x: 0, y: 0, w: 12, h: 12 },
        panelConfig: { bizz: 'buzz' },
      },
    ];
    const result = transformPanelsIn(panels as DashboardPanel[]);
    expect(result.panelsJSON).toEqual(
      JSON.stringify([
        {
          type: 'foo',
          embeddableConfig: { foo: 'bar' },
          panelIndex: '1',
          gridData: { x: 0, y: 0, w: 12, h: 12, i: '1' },
        },
        {
          type: 'bar',
          embeddableConfig: { bizz: 'buzz' },
          panelIndex: 'mock-uuid',
          gridData: { x: 0, y: 0, w: 12, h: 12, i: 'mock-uuid' },
        },
      ])
    );
  });
});
