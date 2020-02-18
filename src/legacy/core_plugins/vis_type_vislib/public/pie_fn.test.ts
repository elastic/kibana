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

// eslint-disable-next-line
import { functionWrapper } from '../../../../plugins/expressions/common/expression_functions/specs/tests/utils';
import { createPieVisFn } from './pie_fn';
// @ts-ignore
import { vislibSlicesResponseHandler } from './vislib/response_handler';

jest.mock('ui/new_platform');
jest.mock('./vislib/response_handler', () => ({
  vislibSlicesResponseHandler: jest.fn().mockReturnValue({
    hits: 1,
    names: ['Count'],
    raw: {
      columns: [],
      rows: [],
    },
    slices: {
      children: [],
    },
    tooltipFormatter: {
      id: 'number',
    },
  }),
}));

describe('interpreter/functions#pie', () => {
  const fn = functionWrapper(createPieVisFn());
  const context = {
    type: 'kibana_datatable',
    rows: [{ 'col-0-1': 0 }],
    columns: [{ id: 'col-0-1', name: 'Count' }],
  };
  const visConfig = {
    type: 'pie',
    addTooltip: true,
    addLegend: true,
    legendPosition: 'right',
    isDonut: true,
    labels: {
      show: false,
      values: true,
      last_level: true,
      truncate: 100,
    },
    dimensions: {
      metric: {
        accessor: 0,
        format: {
          id: 'number',
        },
        params: {},
        aggType: 'count',
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns an object with the correct structure', async () => {
    const actual = await fn(context, { visConfig: JSON.stringify(visConfig) });
    expect(actual).toMatchSnapshot();
  });

  it('calls response handler with correct values', async () => {
    await fn(context, { visConfig: JSON.stringify(visConfig) });
    expect(vislibSlicesResponseHandler).toHaveBeenCalledTimes(1);
    expect(vislibSlicesResponseHandler).toHaveBeenCalledWith(context, visConfig.dimensions);
  });
});
