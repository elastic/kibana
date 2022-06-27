/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { VisParams } from '@kbn/visualizations-plugin/common';
import { getVisTypeFromParams } from './get_vis_type_from_params';

describe('extracting visualization type from vis params', () => {
  [
    {
      message: 'return undefined when no params',
      params: undefined,
      expectedType: undefined,
    },
    {
      message: 'extract a line type',
      params: {
        seriesParams: [
          {
            type: 'line',
          },
        ],
      } as VisParams,
      expectedType: 'line',
    },
    {
      message: 'extract an area type',
      params: {
        seriesParams: [
          {
            type: 'area',
          },
        ],
      } as VisParams,
      expectedType: 'area',
    },
    {
      message: 'extract a histogram type when axes not defined',
      params: {
        seriesParams: [
          {
            type: 'histogram',
          },
        ],
      } as VisParams,
      expectedType: 'histogram',
    },
    {
      message: 'extract a histogram type when first axis on bottom',
      params: {
        seriesParams: [
          {
            type: 'histogram',
          },
        ],
        categoryAxes: [{ position: 'bottom' }],
      } as VisParams,
      expectedType: 'histogram',
    },
    {
      message: 'extract a histogram type when first axis on top',
      params: {
        seriesParams: [
          {
            type: 'histogram',
          },
        ],
        categoryAxes: [{ position: 'top' }],
      } as VisParams,
      expectedType: 'histogram',
    },
    {
      message: 'extract a horizontal_bar type when first axis to left',
      params: {
        seriesParams: [
          {
            type: 'histogram',
          },
        ],
        categoryAxes: [{ position: 'left' }],
      } as VisParams,
      expectedType: 'horizontal_bar',
    },
    {
      message: 'extract a horizontal_bar type when first axis to right',
      params: {
        seriesParams: [
          {
            type: 'histogram',
          },
        ],
        categoryAxes: [{ position: 'right' }],
      } as VisParams,
      expectedType: 'horizontal_bar',
    },
  ].forEach(({ message, params, expectedType }) =>
    it(message, () => {
      expect(getVisTypeFromParams(params)).toBe(expectedType);
    })
  );
});
