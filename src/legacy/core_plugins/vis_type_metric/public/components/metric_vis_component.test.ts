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

// @ts-ignore
import { MetricVisComponent } from './metric_vis_component';
import { Vis } from '../legacy_imports';

jest.mock('ui/new_platform');

describe('metric_vis - controller', function() {
  const vis: Vis = {
    params: {
      metric: {
        colorSchema: 'Green to Red',
        colorsRange: [{ from: 0, to: 1000 }],
        style: {},
      },
      dimensions: {
        metrics: [{ accessor: 0 }],
        bucket: null,
      },
    },
  } as any;

  let metricVis: MetricVisComponent;

  beforeEach(() => {
    metricVis = new MetricVisComponent({
      vis,
      visParams: vis.params,
      visData: {} as any,
      renderComplete: jest.fn(),
    });
  });

  it('should set the metric label and value', function() {
    // @ts-ignore
    const metrics = metricVis.processTableGroups({
      columns: [{ id: 'col-0', name: 'Count' }],
      rows: [{ 'col-0': 4301021 }],
    });

    expect(metrics.length).toBe(1);
    expect(metrics[0].label).toBe('Count');
    expect(metrics[0].value).toBe('<span ng-non-bindable>4301021</span>');
  });

  it('should support multi-value metrics', function() {
    vis.params.dimensions.metrics.push({ accessor: 1 });
    // @ts-ignore
    const metrics = metricVis.processTableGroups({
      columns: [
        { id: 'col-0', name: '1st percentile of bytes' },
        { id: 'col-1', name: '99th percentile of bytes' },
      ],
      rows: [{ 'col-0': 182, 'col-1': 445842.4634666484 }],
    });

    expect(metrics.length).toBe(2);
    expect(metrics[0].label).toBe('1st percentile of bytes');
    expect(metrics[0].value).toBe('<span ng-non-bindable>182</span>');
    expect(metrics[1].label).toBe('99th percentile of bytes');
    expect(metrics[1].value).toBe('<span ng-non-bindable>445842.4634666484</span>');
  });
});
