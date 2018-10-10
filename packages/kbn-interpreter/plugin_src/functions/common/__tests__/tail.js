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
import { tail } from '../tail';
import { functionWrapper, emptyTable, testTable } from '@kbn/interpreter/test_utils';

describe('tail', () => {
  const fn = functionWrapper(tail);
  const lastIndex = testTable.rows.length - 1;

  it('returns a datatable with the last N rows of the context', () => {
    const result = fn(testTable, { count: 2 });

    expect(result.type).to.be('datatable');
    expect(result.columns).to.eql(testTable.columns);
    expect(result.rows).to.have.length(2);
    expect(result.rows[0]).to.eql(testTable.rows[lastIndex - 1]);
    expect(result.rows[1]).to.eql(testTable.rows[lastIndex]);
  });

  it('returns the original context if N >= context.rows.length', () => {
    expect(fn(testTable, { count: testTable.rows.length + 5 })).to.eql(testTable);
    expect(fn(testTable, { count: testTable.rows.length })).to.eql(testTable);
    expect(fn(emptyTable)).to.eql(emptyTable);
  });

  it('returns the last row if N is not specified', () => {
    const result = fn(testTable);

    expect(result.rows).to.have.length(1);
    expect(result.rows[0]).to.eql(testTable.rows[lastIndex]);
  });
});
