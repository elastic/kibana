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
import { table } from '../table';
import { functionWrapper, testTable, fontStyle } from '@kbn/interpreter/test_utils';

describe('table', () => {
  const fn = functionWrapper(table);

  it('returns a render as table', () => {
    const result = fn(testTable, {
      font: fontStyle,
      paginate: false,
      perPage: 2,
    });
    expect(result)
      .to.have.property('type', 'render')
      .and.to.have.property('as', 'table');
  });

  describe('context', () => {
    it('sets the context as the datatable', () => {
      const result = fn(testTable).value;
      expect(result).to.have.property('datatable', testTable);
    });
  });

  describe('args', () => {
    describe('font', () => {
      it('sets the font style of the table', () => {
        const result = fn(testTable, { font: fontStyle }).value;
        expect(result).to.have.property('font', fontStyle);
      });

      it('defaults to a Canvas expression that calls the font function', () => {
        const result = fn(testTable).value;
        expect(result).to.have.property('font', '{font}'); // should evaluate to a font object and not a string
      });
    });

    describe('paginate', () => {
      it('sets whether or not to paginate the table', () => {
        let result = fn(testTable, { paginate: true }).value;
        expect(result).to.have.property('paginate', true);

        result = fn(testTable, { paginate: false }).value;
        expect(result).to.have.property('paginate', false);
      });

      it('defaults to true', () => {
        const result = fn(testTable).value;
        expect(result).to.have.property('paginate', true);
      });
    });

    describe('perPage', () => {
      it('sets how many rows display per page', () => {
        const result = fn(testTable, { perPage: 30 }).value;
        expect(result).to.have.property('perPage', 30);
      });

      it('defaults to 10', () => {
        const result = fn(testTable).value;
        expect(result).to.have.property('perPage', 10);
      });
    });

    describe('showHeader', () => {
      it('sets the showHeader property', () => {
        const result = fn(testTable, { showHeader: false }).value;
        expect(result).to.have.property('showHeader', false);
      });

      it('defaults to true', () => {
        const result = fn(testTable).value;
        expect(result).to.have.property('showHeader', true);
      });
    });
  });
});
