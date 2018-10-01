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
import { rounddate } from '../rounddate';
import { functionWrapper } from '@kbn/interpreter/test_utils';

describe('rounddate', () => {
  const fn = functionWrapper(rounddate);
  const date = new Date('2011-10-31T00:00:00.000Z').valueOf();

  it('returns date in ms from date in ms or ISO8601 string', () => {
    expect(fn(date, { format: 'YYYY' })).to.be(1293840000000);
  });

  describe('args', () => {
    describe('format', () => {
      it('sets the format for the rounded date', () => {
        expect(fn(date, { format: 'YYYY-MM' })).to.be(1317427200000);
        expect(fn(date, { format: 'YYYY-MM-DD-hh' })).to.be(1320062400000);
      });

      it('returns original date if format is not provided', () => {
        expect(fn(date)).to.be(date);
      });
    });
  });
});
