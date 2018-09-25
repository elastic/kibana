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
import { getCell } from '../get_cell';
import { functionWrapper, emptyTable, testTable } from '@kbn/interpreter/test_utils';

describe('getCell', () => {
  const fn = functionWrapper(getCell);

  it('returns the value from the specified row and column', () => {
    const arbitraryRowIndex = 3;

    expect(fn(testTable, { column: 'quantity', row: arbitraryRowIndex })).to.eql(
      testTable.rows[arbitraryRowIndex].quantity
    );
  });

  describe('args', () => {
    const firstColumn = testTable.columns[0].name;

    it('defaults to first column in first row if no args are provided', () => {
      expect(fn(testTable)).to.be(testTable.rows[0][firstColumn]);
    });

    describe('column', () => {
      const arbitraryRowIndex = 1;

      it('sets which column to get the value from', () => {
        expect(fn(testTable, { column: 'price', row: arbitraryRowIndex })).to.be(
          testTable.rows[arbitraryRowIndex].price
        );
      });

      it('defaults to first column if not provided', () => {
        expect(fn(testTable, { row: arbitraryRowIndex })).to.be(
          testTable.rows[arbitraryRowIndex][firstColumn]
        );
      });

      it('throws when invalid column is provided', () => {
        expect(() => fn(testTable, { column: 'foo' })).to.throwException(e => {
          expect(e.message).to.be('Column not found: foo');
        });
      });
    });

    describe('row', () => {
      it('sets which row to get the value from', () => {
        const arbitraryRowIndex = 8;

        expect(fn(testTable, { column: 'in_stock', row: arbitraryRowIndex })).to.eql(
          testTable.rows[arbitraryRowIndex].in_stock
        );
      });

      it('defaults to first row if not specified', () => {
        expect(fn(testTable, { column: 'name' })).to.eql(testTable.rows[0].name);
      });

      it('throws when row does not exist', () => {
        const invalidRow = testTable.rows.length;

        expect(() => fn(testTable, { column: 'name', row: invalidRow })).to.throwException(e => {
          expect(e.message).to.be(`Row not found: ${invalidRow}`);
        });

        expect(() => fn(emptyTable, { column: 'foo' })).to.throwException(e => {
          expect(e.message).to.be('Row not found: 0');
        });

        expect(() => fn(emptyTable)).to.throwException(e => {
          expect(e.message).to.be('Row not found: 0');
        });
      });
    });
  });
});
