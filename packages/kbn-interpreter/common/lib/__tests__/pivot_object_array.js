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
import { pivotObjectArray } from '../pivot_object_array';

describe('pivotObjectArray', () => {
  let rows;

  beforeEach(() => {
    rows = [
      { make: 'honda', model: 'civic', price: '10000' },
      { make: 'toyota', model: 'corolla', price: '12000' },
      { make: 'tesla', model: 'model 3', price: '35000' },
    ];
  });

  it('converts array of objects', () => {
    const data = pivotObjectArray(rows);

    expect(data).to.be.an('object');
    expect(data).to.have.property('make');
    expect(data).to.have.property('model');
    expect(data).to.have.property('price');

    expect(data.make).to.eql(['honda', 'toyota', 'tesla']);
    expect(data.model).to.eql(['civic', 'corolla', 'model 3']);
    expect(data.price).to.eql(['10000', '12000', '35000']);
  });

  it('uses passed in column list', () => {
    const data = pivotObjectArray(rows, ['price']);

    expect(data).to.be.an('object');
    expect(data).to.eql({ price: ['10000', '12000', '35000'] });
  });

  it('adds missing columns with undefined values', () => {
    const data = pivotObjectArray(rows, ['price', 'missing']);

    expect(data).to.be.an('object');
    expect(data).to.eql({
      price: ['10000', '12000', '35000'],
      missing: [undefined, undefined, undefined],
    });
  });

  it('throws when given an invalid column list', () => {
    const check = () => pivotObjectArray(rows, [{ name: 'price' }, { name: 'missing' }]);
    expect(check).to.throwException('Columns should be an array of strings');
  });
});
