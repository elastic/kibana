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

import { AggTypeFilters } from './agg_type_filters';

describe('AggTypeFilters', () => {
  let registry: AggTypeFilters;
  const indexPattern = { id: '1234', fields: [], title: 'foo' };
  const aggConfig = {};

  beforeEach(() => {
    registry = new AggTypeFilters();
  });

  it('should filter nothing without registered filters', async () => {
    const aggTypes = [{ name: 'count' }, { name: 'sum' }];
    const filtered = registry.filter(aggTypes, indexPattern, aggConfig);
    expect(filtered).toEqual(aggTypes);
  });

  it('should pass all aggTypes to the registered filter', async () => {
    const aggTypes = [{ name: 'count' }, { name: 'sum' }];
    const filter = jest.fn();
    registry.addFilter(filter);
    registry.filter(aggTypes, indexPattern, aggConfig);
    expect(filter).toHaveBeenCalledWith(aggTypes[0], indexPattern, aggConfig);
    expect(filter).toHaveBeenCalledWith(aggTypes[1], indexPattern, aggConfig);
  });

  it('should allow registered filters to filter out aggTypes', async () => {
    const aggTypes = [{ name: 'count' }, { name: 'sum' }, { name: 'avg' }];
    let filtered = registry.filter(aggTypes, indexPattern, aggConfig);
    expect(filtered).toEqual(aggTypes);

    registry.addFilter(() => true);
    registry.addFilter(aggType => aggType.name !== 'count');
    filtered = registry.filter(aggTypes, indexPattern, aggConfig);
    expect(filtered).toEqual([aggTypes[1], aggTypes[2]]);

    registry.addFilter(aggType => aggType.name !== 'avg');
    filtered = registry.filter(aggTypes, indexPattern, aggConfig);
    expect(filtered).toEqual([aggTypes[1]]);
  });
});
