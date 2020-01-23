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

const fn = require(`../average`);
import moment from 'moment';
const expect = require('chai').expect;
import _ from 'lodash';

describe('average.js', function() {
  describe('average', function() {
    it('fills holes in the data', function() {
      const data = [
        [moment.utc('1980', 'YYYY').valueOf(), 10],
        [moment.utc('1983', 'YYYY').valueOf(), 40],
        [moment.utc('1984', 'YYYY').valueOf(), 50],
      ];

      const target = [
        [moment.utc('1980', 'YYYY').valueOf(), null],
        [moment.utc('1981', 'YYYY').valueOf(), null],
        [moment.utc('1982', 'YYYY').valueOf(), null],
        [moment.utc('1983', 'YYYY').valueOf(), null],
        [moment.utc('1984', 'YYYY').valueOf(), null],
      ];

      expect(_.map(fn(data, target), 1)).to.eql([10, 20, 30, 40, 50]);
    });

    describe('sampling', function() {
      it('up', function() {
        const data = [
          [moment.utc('1981', 'YYYY').valueOf(), 10],
          [moment.utc('1983', 'YYYY').valueOf(), 30],
          [moment.utc('1985', 'YYYY').valueOf(), 70],
        ];

        const target = [
          [moment.utc('1981', 'YYYY').valueOf(), null],
          [moment.utc('1982', 'YYYY').valueOf(), null],
          [moment.utc('1983', 'YYYY').valueOf(), null],
          [moment.utc('1984', 'YYYY').valueOf(), null],
          [moment.utc('1985', 'YYYY').valueOf(), null],
        ];

        expect(_.map(fn(data, target), 1)).to.eql([10, 20, 30, 50, 70]);
      });

      it('down', function() {
        const data = [
          [moment.utc('1980', 'YYYY').valueOf(), 0],
          [moment.utc('1981', 'YYYY').valueOf(), 2],
          [moment.utc('1982', 'YYYY').valueOf(), 4],
          [moment.utc('1983', 'YYYY').valueOf(), 6],
          [moment.utc('1984', 'YYYY').valueOf(), 8],
          [moment.utc('1985', 'YYYY').valueOf(), 10],
          [moment.utc('1986', 'YYYY').valueOf(), 12],
        ];

        const target = [
          [moment.utc('1981', 'YYYY').valueOf(), null],
          [moment.utc('1983', 'YYYY').valueOf(), null],
          [moment.utc('1985', 'YYYY').valueOf(), null],
        ];

        // This returns 1, 5, 9 instead of the expected 2, 6, 10 because the average function does not consider "future"
        // values, rather just the next upcoming value from the end of the previously predicted bucket. E.g., When
        // interpolating a weekly series into daily, in which the buckets fall on sundays, this coming Sunday's bucket
        // will be distributed Mon-Sun instead of say Thur-Wed.
        // Essentially the algorithm is left aligned instead of centered
        expect(_.map(fn(data, target), 1)).to.eql([1, 5, 9]);
      });
    });
  });
});
