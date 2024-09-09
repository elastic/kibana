/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Vis } from '@kbn/visualizations-plugin/public';
import type { Panel } from '../../common/types';
import { convertTSVBtoLensConfiguration } from '.';

const model = {
  axis_position: 'left',
  type: 'timeseries',
  index_pattern: { id: 'test2' },
  use_kibana_indexes: true,
  series: [
    {
      color: '#000000',
      chart_type: 'line',
      fill: '0',
      id: '85147356-c185-4636-9182-d55f3ab2b6fa',
      palette: {
        name: 'default',
        type: 'palette',
      },
      split_mode: 'everything',
      metrics: [
        {
          id: '3fa8b32f-5c38-4813-9361-1f2817ae5b18',
          type: 'count',
        },
      ],
      override_index_pattern: 0,
    },
  ],
} as Panel;

describe('convertTSVBtoLensConfiguration', () => {
  test('should return null for a not supported chart', async () => {
    const metricModel = {
      ...model,
      type: 'markdown',
    } as Panel;
    const triggerOptions = await convertTSVBtoLensConfiguration({
      params: metricModel,
    } as Vis<Panel>);
    expect(triggerOptions).toBeNull();
  });
});
