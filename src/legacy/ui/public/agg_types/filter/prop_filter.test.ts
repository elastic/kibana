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

import expect from '@kbn/expect';
import { propFilter } from './prop_filter';

describe('prop filter', () => {
  let nameFilter: Function;

  beforeEach(() => {
    nameFilter = propFilter('name');
  });

  function getObjects(...names: string[]) {
    const count = new Map();
    const objects = [];

    for (const name of names) {
      if (!count.has(name)) {
        count.set(name, 1);
      }
      objects.push({
        name,
        title: `${name} ${count.get(name)}`,
      });
      count.set(name, count.get(name) + 1);
    }
    return objects;
  }

  it('returns list when no filters are provided', () => {
    const objects = getObjects('table', 'table', 'pie');
    expect(nameFilter(objects)).to.eql(objects);
  });

  it('returns list when empty list of filters is provided', () => {
    const objects = getObjects('table', 'table', 'pie');
    expect(nameFilter(objects, [])).to.eql(objects);
  });

  it('should keep only the tables', () => {
    const objects = getObjects('table', 'table', 'pie');
    expect(nameFilter(objects, 'table')).to.eql(getObjects('table', 'table'));
  });

  it('should support comma-separated values', () => {
    const objects = getObjects('table', 'line', 'pie');
    expect(nameFilter(objects, 'table,line')).to.eql(getObjects('table', 'line'));
  });

  it('should support an array of values', () => {
    const objects = getObjects('table', 'line', 'pie');
    expect(nameFilter(objects, ['table', 'line'])).to.eql(getObjects('table', 'line'));
  });

  it('should return all objects', () => {
    const objects = getObjects('table', 'line', 'pie');
    expect(nameFilter(objects, '*')).to.eql(objects);
  });

  it('should allow negation', () => {
    const objects = getObjects('table', 'line', 'pie');
    expect(nameFilter(objects, ['!line'])).to.eql(getObjects('table', 'pie'));
  });

  it('should support a function for specifying what should be kept', () => {
    const objects = getObjects('table', 'line', 'pie');
    const line = (value: string) => value === 'line';
    expect(nameFilter(objects, line)).to.eql(getObjects('line'));
  });

  it('gracefully handles a filter function with zero arity', () => {
    const objects = getObjects('table', 'line', 'pie');
    const rejectEverything = () => false;
    expect(nameFilter(objects, rejectEverything)).to.eql([]);
  });
});
