/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createEmbeddableStartMock } from '@kbn/embeddable-plugin/server/mocks';
import { DashboardPanel } from '../../types';
import { transformPanelsIn } from './panels_in_transforms';

jest.mock('uuid', () => {
  let uuid = 100;
  return { v4: () => `mock-uuid-${uuid++}` };
});

const embeddableStartMock = createEmbeddableStartMock();

describe('transformPanelsIn', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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
      {
        type: 'baz',
        gridData: { x: 0, y: 0, w: 12, h: 12 },
        panelIndex: '3',
        panelConfig: { savedObjectId: '123' },
      },
      {
        title: 'My section',
        gridData: { y: 0 },
        panels: [
          {
            type: 'buzz',
            gridData: { x: 0, y: 0, w: 12, h: 12 },
            panelConfig: { bizzy: 'bazz' },
          },
        ],
      },
    ];
    const { panelsJSON, sections, references } = transformPanelsIn(
      panels as DashboardPanel[],
      embeddableStartMock
    );
    const extractSpy = jest.spyOn(embeddableStartMock, 'extract');
    expect(extractSpy).toHaveBeenCalledTimes(4);
    expect(extractSpy).toHaveBeenNthCalledWith(1, {
      type: 'foo',
      foo: 'bar',
    });
    expect(extractSpy).toHaveBeenNthCalledWith(2, {
      type: 'bar',
      bizz: 'buzz',
    });
    expect(extractSpy).toHaveBeenNthCalledWith(3, {
      type: 'baz',
      savedObjectId: '123',
    });
    expect(extractSpy).toHaveBeenNthCalledWith(4, {
      type: 'buzz',
      bizzy: 'bazz',
    });
    expect(panelsJSON).toEqual(
      JSON.stringify([
        {
          gridData: { x: 0, y: 0, w: 12, h: 12, i: '1' },
          embeddableConfig: { foo: 'bar' },
          panelIndex: '1',
          type: 'foo',
        },
        {
          gridData: { x: 0, y: 0, w: 12, h: 12, i: 'mock-uuid-100' },
          embeddableConfig: { bizz: 'buzz' },
          panelIndex: 'mock-uuid-100',
          type: 'bar',
        },
        {
          gridData: { x: 0, y: 0, w: 12, h: 12, i: '3' },
          embeddableConfig: {},
          panelIndex: '3',
          panelRefName: 'panel_3',
          type: 'baz',
        },
        {
          gridData: { x: 0, y: 0, w: 12, h: 12, i: 'mock-uuid-102', sectionId: 'mock-uuid-101' },
          embeddableConfig: { bizzy: 'bazz' },
          panelIndex: 'mock-uuid-102',
          type: 'buzz',
        },
      ])
    );
    expect(references).toEqual([
      {
        name: '3:panel_3',
        type: 'baz',
        id: '123',
      },
    ]);

    expect(sections).toEqual([
      {
        title: 'My section',
        gridData: { y: 0, i: 'mock-uuid-101' },
      },
    ]);
  });
});
