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

import { createMetricVisFn } from './metric_vis_fn';
import { functionWrapper } from '../../expressions/common/expression_functions/specs/tests/utils';

describe('interpreter/functions#metric', () => {
  const fn = functionWrapper(createMetricVisFn());
  const context = {
    type: 'datatable',
    rows: [{ 'col-0-1': 0 }],
    columns: [{ id: 'col-0-1', name: 'Count' }],
  };
  const args = {
    percentageMode: false,
    useRanges: false,
    colorSchema: 'Green to Red',
    metricColorMode: 'None',
    colorsRange: [
      {
        from: 0,
        to: 10000,
      },
    ],
    labels: {
      show: true,
    },
    invertColors: false,
    style: {
      bgFill: '#000',
      bgColor: false,
      labelColor: false,
      subText: '',
      fontSize: 60,
    },
    font: { spec: { fontSize: 60 } },
    metrics: [
      {
        accessor: 0,
        format: {
          id: 'number',
        },
        params: {},
        aggType: 'count',
      },
    ],
  };

  it('returns an object with the correct structure', () => {
    const actual = fn(context, args, undefined);

    expect(actual).toMatchSnapshot();
  });
});
