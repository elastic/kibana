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

import { first } from 'rxjs/operators';
import { AggTypeFilters } from './agg_type_filters';

describe('AggTypeFilters', () => {
  let registry: AggTypeFilters;
  const indexPattern = {};
  const aggConfig = {};

  beforeEach(() => {
    registry = new AggTypeFilters();
  });

  it('should filter nothing without registered filters', async () => {
    const aggTypes = [{ name: 'count' }, { name: 'sum' }];
    const observable = registry.filter$(aggTypes, indexPattern, aggConfig);
    const filtered = await observable.pipe(first()).toPromise();
    expect(filtered).toEqual(aggTypes);
  });

  it('should emit a new filtered list when registering a new filter', async () => {
    const aggTypes = [{ name: 'count' }, { name: 'sum' }];
    const observable = registry.filter$(aggTypes, indexPattern, aggConfig);
    const spy = jest.fn();
    observable.subscribe(spy);
    expect(spy).toHaveBeenCalledTimes(1);
    registry.addFilter(() => true);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('should pass all aggTypes to the registered filter', async () => {
    const aggTypes = [{ name: 'count' }, { name: 'sum' }];
    const filter = jest.fn();
    registry.addFilter(filter);
    await registry
      .filter$(aggTypes, indexPattern, aggConfig)
      .pipe(first())
      .toPromise();
    expect(filter).toHaveBeenCalledWith(aggTypes[0], indexPattern, aggConfig);
    expect(filter).toHaveBeenCalledWith(aggTypes[1], indexPattern, aggConfig);
  });

  it('should allow registered filters to filter out aggTypes', async () => {
    const aggTypes = [{ name: 'count' }, { name: 'sum' }, { name: 'avg' }];
    const observable = registry.filter$(aggTypes, indexPattern, aggConfig);
    let filtered = await observable.pipe(first()).toPromise();
    expect(filtered).toEqual(aggTypes);

    registry.addFilter(() => true);
    registry.addFilter(aggType => aggType.name !== 'count');
    filtered = await observable.pipe(first()).toPromise();
    expect(filtered).toEqual([aggTypes[1], aggTypes[2]]);

    registry.addFilter(aggType => aggType.name !== 'avg');
    filtered = await observable.pipe(first()).toPromise();
    expect(filtered).toEqual([aggTypes[1]]);
  });
});
