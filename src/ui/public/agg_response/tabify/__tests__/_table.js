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

import _ from 'lodash';
import expect from 'expect.js';
import { TabifyTable } from '../_table';

describe('TabifyTable class', function () {
  it('exposes rows array, but not the columns', function () {
    const table = new TabifyTable();
    expect(table.rows).to.be.an('array');
    expect(table.columns == null).to.be.ok();
  });

  describe('#aggConfig', function () {
    it('accepts a column from the table and returns its agg config', function () {
      const table = new TabifyTable();
      const football = {};
      const column = {
        aggConfig: football
      };

      expect(table.aggConfig(column)).to.be(football);
    });

    it('throws a TypeError if the column is malformed', function () {
      expect(function () {
        const notAColumn = {};
        (new TabifyTable()).aggConfig(notAColumn);
      }).to.throwException(TypeError);
    });
  });

  describe('#title', function () {
    it('returns nothing if the table is not part of a table group', function () {
      const table = new TabifyTable();
      expect(table.title()).to.be('');
    });

    it('returns the title of the TabifyTableGroup if the table is part of one', function () {
      const table = new TabifyTable();
      table.$parent = {
        title: 'TabifyTableGroup Title',
        tables: [table]
      };

      expect(table.title()).to.be('TabifyTableGroup Title');
    });
  });

  describe('#field', function () {
    it('calls the columns aggConfig#getField() method', function () {
      const table = new TabifyTable();
      const football = {};
      const column = {
        aggConfig: {
          getField: _.constant(football)
        }
      };

      expect(table.field(column)).to.be(football);
    });
  });

  describe('#fieldFormatter', function () {
    it('calls the columns aggConfig#fieldFormatter() method', function () {
      const table = new TabifyTable();
      const football = {};
      const column = {
        aggConfig: {
          fieldFormatter: _.constant(football)
        }
      };

      expect(table.fieldFormatter(column)).to.be(football);
    });
  });
});
