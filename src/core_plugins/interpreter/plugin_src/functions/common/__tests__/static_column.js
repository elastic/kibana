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

import expect from 'expect.js';
import { staticColumn } from '../static_column';
import { functionWrapper, testTable } from '@kbn/interpreter/test_utils';

describe('staticColumn', () => {
  const fn = functionWrapper(staticColumn);

  it('adds a column to a datatable with a static value in every row', () => {
    const result = fn(testTable, { name: 'foo', value: 'bar' });

    expect(result.type).to.be('datatable');
    expect(result.columns).to.eql([...testTable.columns, { name: 'foo', type: 'string' }]);
    expect(result.rows.every(row => typeof row.foo === 'string')).to.be(true);
    expect(result.rows.every(row => row.foo === 'bar')).to.be(true);
  });

  it('overwrites an existing column if provided an existing column name', () => {
    const result = fn(testTable, { name: 'name', value: 'John' });

    expect(result.type).to.be('datatable');
    expect(result.columns).to.eql(testTable.columns);
    expect(result.rows.every(row => typeof row.name === 'string')).to.be(true);
    expect(result.rows.every(row => row.name === 'John')).to.be(true);
  });

  it('adds a column with null values', () => {
    const result = fn(testTable, { name: 'empty' });

    expect(result.type).to.be('datatable');
    expect(result.columns).to.eql([...testTable.columns, { name: 'empty', type: 'null' }]);
    expect(result.rows.every(row => row.empty === null)).to.be(true);
  });
});
