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
import { asFn } from '../as';
import { functionWrapper } from '@kbn/interpreter/test_utils';

describe('as', () => {
  const fn = functionWrapper(asFn);

  it('returns a datatable with a single column and single row', () => {
    expect(fn('foo', { name: 'bar' })).to.eql({
      type: 'datatable',
      columns: [{ name: 'bar', type: 'string' }],
      rows: [{ bar: 'foo' }],
    });

    expect(fn(2, { name: 'num' })).to.eql({
      type: 'datatable',
      columns: [{ name: 'num', type: 'number' }],
      rows: [{ num: 2 }],
    });

    expect(fn(true, { name: 'bool' })).to.eql({
      type: 'datatable',
      columns: [{ name: 'bool', type: 'boolean' }],
      rows: [{ bool: true }],
    });
  });

  describe('args', () => {
    describe('name', () => {
      it('sets the column name of the resulting datatable', () => {
        expect(fn(null, { name: 'foo' }).columns[0].name).to.eql('foo');
      });

      it('returns a datatable with the column name \'value\'', () => {
        expect(fn(null).columns[0].name).to.eql('value');
      });
    });
  });
});
