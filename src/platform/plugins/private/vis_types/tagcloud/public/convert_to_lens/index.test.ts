/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

vi.mock('uuid', () => {
      const mocked = {
      v4: vi.fn().mockReturnValue('12345'),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('@kbn/visualizations-plugin/public', () => {
      const mocked = {
      getConvertToLensModule: async () => ({
        getColumnsFromVis: vi.fn(() => {
          return [
            {
              metrics: ['0cdf0372-a78f-438f-9fc0-df9ad83796df'],
              buckets: {
                all: ['8a2556cf-dfb2-49f1-83cb-8892e1eace1c'],
              },
              columns: [
                {
                  columnId: '8a2556cf-dfb2-49f1-83cb-8892e1eace1c',
                  meta: {
                    aggId: '2',
                  },
                },
              ],
            },
          ];
        }),
      }),
      getDataViewByIndexPatternId: vi.fn(() => ({ id: 'myDataViewId' })),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../services', () => {
      const mocked = {
      getDataViewsStart: () => ({ get: () => ({}), getDefault: () => ({}) }),
    };
      return { ...mocked, default: mocked };
    });

import type { Vis } from '@kbn/visualizations-plugin/public';
import type { TagCloudVisParams } from '../types';
import type { TimefilterContract } from '@kbn/data-plugin/public';
import { convertToLens } from '.';

test('should convert legacy tag cloud vis into navigate to lens context', async () => {
  const mockVis = {
    data: {
      indexPattern: {
        id: 'myDataViewId',
      },
    },
    params: {
      maxFontSize: 81,
      minFontSize: 27,
      orientation: 'right angled',
      palette: {
        name: 'status',
        type: 'palette',
      },
      scale: 'linear',
      showLabel: true,
    },
  } as unknown as Vis<TagCloudVisParams>;
  expect(await convertToLens(mockVis, {} as unknown as TimefilterContract)).toEqual({
    type: 'lnsTagcloud',
    layers: [
      {
        indexPatternId: 'myDataViewId',
        layerId: '12345',
        columns: [
          {
            columnId: '8a2556cf-dfb2-49f1-83cb-8892e1eace1c',
          },
        ],
        columnOrder: [],
        ignoreGlobalFilters: false,
      },
    ],
    configuration: {
      layerId: '12345',
      layerType: 'data',
      valueAccessor: '0cdf0372-a78f-438f-9fc0-df9ad83796df',
      tagAccessor: '8a2556cf-dfb2-49f1-83cb-8892e1eace1c',
      maxFontSize: 81,
      minFontSize: 27,
      orientation: 'right angled',
      palette: {
        name: 'status',
        type: 'palette',
      },
      showLabel: true,
    },
    indexPatternIds: ['myDataViewId'],
  });
});
