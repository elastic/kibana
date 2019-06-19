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

import { functionWrapper } from '../../interpreter/test_helpers';
import { kibanaTable } from './table_vis_fn';

const mockResponseHandler = jest.fn().mockReturnValue(Promise.resolve({
  tables: [{ columns: [], rows: [] }],
}));
jest.mock('ui/vis/response_handlers/legacy', () => ({
  legacyResponseHandlerProvider: () => ({ handler: mockResponseHandler }),
}));

describe('interpreter/functions#table', () => {
  const fn = functionWrapper(kibanaTable);
  const context = {
    type: 'kibana_datatable',
    rows: [{ 'col-0-1': 0 }],
    columns: [{ id: 'col-0-1', name: 'Count' }],
  };
  const visConfig = {
    perPage: 10,
    showPartialRows: false,
    showMetricsAtAllLevels: false,
    sort: {
      columnIndex: null,
      direction: null
    },
    showTotal: false,
    totalFunc: 'sum',
    dimensions: {
      metrics: [
        {
          accessor: 0,
          format: {
            id: 'number'
          },
          params: {},
          aggType: 'count'
        }
      ],
      buckets: []
    }
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
    expect(mockResponseHandler).toHaveBeenCalledTimes(1);
    expect(mockResponseHandler).toHaveBeenCalledWith(context, visConfig.dimensions);
  });
});
