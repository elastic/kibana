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

import { Vis } from 'ui/vis';
import { AggTypeFieldFilters } from './field_filters';

describe('AggTypeFieldFilters', () => {
  let registry: AggTypeFieldFilters;
  const fieldParamType = {};
  const aggConfig = {};
  const vis = {} as Vis;

  beforeEach(() => {
    registry = new AggTypeFieldFilters();
  });

  it('should filter nothing without registered filters', async () => {
    const fields = [{ name: 'foo' }, { name: 'bar' }];
    const filtered = registry.filter(fields, fieldParamType, aggConfig, vis);
    expect(filtered).toEqual(fields);
  });

  it('should pass all fields to the registered filter', async () => {
    const fields = [{ name: 'foo' }, { name: 'bar' }];
    const filter = jest.fn();
    registry.addFilter(filter);
    registry.filter(fields, fieldParamType, aggConfig, vis);
    expect(filter).toHaveBeenCalledWith(fields[0], fieldParamType, aggConfig, vis);
    expect(filter).toHaveBeenCalledWith(fields[1], fieldParamType, aggConfig, vis);
  });

  it('should allow registered filters to filter out fields', async () => {
    const fields = [{ name: 'foo' }, { name: 'bar' }];
    let filtered = registry.filter(fields, fieldParamType, aggConfig, vis);
    expect(filtered).toEqual(fields);

    registry.addFilter(() => true);
    registry.addFilter(field => field.name !== 'foo');
    filtered = registry.filter(fields, fieldParamType, aggConfig, vis);
    expect(filtered).toEqual([fields[1]]);

    registry.addFilter(field => field.name !== 'bar');
    filtered = registry.filter(fields, fieldParamType, aggConfig, vis);
    expect(filtered).toEqual([]);
  });
});
