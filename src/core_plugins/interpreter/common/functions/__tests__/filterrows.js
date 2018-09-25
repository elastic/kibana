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
import { filterrows } from '../filterrows';
import { functionWrapper, testTable } from '@kbn/interpreter/test_utils';

const inStock = datatable => datatable.rows[0].in_stock;
const returnFalse = () => false;

describe('filterrows', () => {
  const fn = functionWrapper(filterrows);

  it('returns a datable', () => {
    return fn(testTable, { fn: inStock }).then(result => {
      expect(result).to.have.property('type', 'datatable');
    });
  });

  it('keeps rows that evaluate to true and removes rows that evaluate to false', () => {
    const inStockRows = testTable.rows.filter(row => row.in_stock);

    return fn(testTable, { fn: inStock }).then(result => {
      expect(result.columns).to.eql(testTable.columns);
      expect(result.rows).to.eql(inStockRows);
    });
  });

  it('returns datatable with no rows when no rows meet function condition', () => {
    return fn(testTable, { fn: returnFalse }).then(result => {
      expect(result.rows).to.be.empty();
    });
  });

  it('throws when no function is provided', () => {
    expect(() => fn(testTable)).to.throwException(e => {
      expect(e.message).to.be('fn is not a function');
    });
  });
});
