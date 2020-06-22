/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { createBrushHandler } from './create_brush_handler';
import { ExprVis } from '../../../../visualizations/public';

describe('brushHandler', () => {
  let onBrush: ReturnType<typeof createBrushHandler>;
  let vis: ExprVis;

  beforeEach(() => {
    vis = ({
      API: {
        events: {
          brush: jest.fn(),
        },
      },
      params: {
        time_field: 'time_field',
        index_pattern: 'index_pattern',
      },
    } as unknown) as ExprVis;

    onBrush = createBrushHandler(vis);
  });

  test('returns brushHandler() should updates timefilter through vis.API.events.brush', () => {
    const gte = '2017-01-01T00:00:00Z';
    const lte = '2017-01-01T00:10:00Z';

    onBrush(gte, lte);

    expect(vis.API.events.brush).toHaveBeenCalledWith({
      timeFieldName: 'time_field',
      timeRangeFilter: {
        meta: { index: 'index_pattern', params: {} },
        range: { time_field: { gte: '2017-01-01T00:00:00.000Z', lte: '2017-01-01T00:10:00.000Z' } },
      },
    });
  });
});
