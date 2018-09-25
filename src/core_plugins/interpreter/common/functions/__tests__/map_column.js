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
import { mapColumn } from '../map_column';
import { functionWrapper, testTable } from '@kbn/interpreter/test_utils';

const pricePlusTwo = datatable => Promise.resolve(datatable.rows[0].price + 2);

describe('mapColumn', () => {
  const fn = functionWrapper(mapColumn);

  it('returns a datatable with a new column with the values from mapping a function over each row in a datatable', () => {
    return fn(testTable, { name: 'pricePlusTwo', expression: pricePlusTwo }).then(result => {
      const arbitraryRowIndex = 2;

      expect(result.type).to.be('datatable');
      expect(result.columns).to.eql([
        ...testTable.columns,
        { name: 'pricePlusTwo', type: 'number' },
      ]);
      expect(result.columns[result.columns.length - 1]).to.have.property('name', 'pricePlusTwo');
      expect(result.rows[arbitraryRowIndex]).to.have.property('pricePlusTwo');
    });
  });

  it('overwrites existing column with the new column if an existing column name is provided', () => {
    return fn(testTable, { name: 'name', expression: pricePlusTwo }).then(result => {
      const nameColumnIndex = result.columns.findIndex(({ name }) => name === 'name');
      const arbitraryRowIndex = 4;

      expect(result.type).to.be('datatable');
      expect(result.columns).to.have.length(testTable.columns.length);
      expect(result.columns[nameColumnIndex])
        .to.have.property('name', 'name')
        .and.to.have.property('type', 'number');
      expect(result.rows[arbitraryRowIndex]).to.have.property('name', 202);
    });
  });

  describe('expression', () => {
    it('maps null values to the new column', () => {
      return fn(testTable, { name: 'empty' }).then(result => {
        const emptyColumnIndex = result.columns.findIndex(({ name }) => name === 'empty');
        const arbitraryRowIndex = 8;

        expect(result.columns[emptyColumnIndex])
          .to.have.property('name', 'empty')
          .and.to.have.property('type', 'null');
        expect(result.rows[arbitraryRowIndex]).to.have.property('empty', null);
      });
    });
  });
});
