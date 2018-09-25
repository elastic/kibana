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
import { formatdate } from '../formatdate';
import { functionWrapper } from '@kbn/interpreter/test_utils';

describe('formatdate', () => {
  const fn = functionWrapper(formatdate);

  it('returns formatted date string from ms or ISO8601 string using the given format', () => {
    const testDate = new Date('2011-10-31T12:30:45Z').valueOf();
    expect(fn(testDate, { format: 'MM/DD/YYYY' })).to.be('10/31/2011');
  });

  describe('args', () => {
    describe('format', () => {
      it('sets the format of the returned date string', () => {
        const testDate = new Date('2013-03-12T08:03:27Z').valueOf();
        expect(fn(testDate, { format: 'MMMM Do YYYY, h:mm:ss a' })).to.be(
          'March 12th 2013, 8:03:27 am'
        );
        expect(fn(testDate, { format: 'MMM Do YY' })).to.be('Mar 12th 13');
      });

      it('defaults to ISO 8601 format', () => {
        const testDate = new Date('2018-01-08T20:15:59Z').valueOf();
        expect(fn(testDate)).to.be('2018-01-08T20:15:59.000Z');
      });
    });
  });
});
