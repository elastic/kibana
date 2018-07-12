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

jest.mock('../agg_params', () => ({
  AggParams: class AggParams {
    constructor(params) {
      return [...params];
    }
  },
}));

import { AggParamFilters } from './agg_param_filters';

describe('AggParamFilters', () => {
  let registry: AggParamFilters;
  const indexPattern = {};
  const aggConfig = {};

  beforeEach(() => {
    registry = new AggParamFilters();
  });

  it('should filter nothing without registered filters', async () => {
    const aggParams = [{ name: 'field' }, { name: 'interval' }];
    const filtered = registry.filter(aggParams, indexPattern, aggConfig);
    expect(filtered).toEqual(aggParams);
  });

  it('should pass all aggParams to the registered filter', async () => {
    const aggParams = [{ name: 'field' }, { name: 'interval' }];
    const filter = jest.fn();
    registry.addFilter(filter);
    registry.filter(aggParams, indexPattern, aggConfig);
    expect(filter).toHaveBeenCalledWith(aggParams[0], indexPattern, aggConfig);
    expect(filter).toHaveBeenCalledWith(aggParams[1], indexPattern, aggConfig);
  });

  it('should allow registered filters to filter out aggParams', async () => {
    const aggParams = [{ name: 'field' }, { name: 'interval' }, { name: 'json' }];
    let filtered = registry.filter(aggParams, indexPattern, aggConfig);
    expect(filtered).toEqual(aggParams);

    registry.addFilter(() => true);
    registry.addFilter(aggType => aggType.name !== 'field');
    filtered = registry.filter(aggParams, indexPattern, aggConfig);
    expect(filtered).toEqual([aggParams[1], aggParams[2]]);

    registry.addFilter(aggType => aggType.name !== 'json');
    filtered = registry.filter(aggParams, indexPattern, aggConfig);
    expect(filtered).toEqual([aggParams[1]]);
  });
});
