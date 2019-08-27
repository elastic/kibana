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

import expect from '@kbn/expect';
import { TimeCache } from '../time_cache';

describe(`TimeCache`, () => {

  class FauxTimefilter {
    constructor(min, max) {
      // logs all requests
      this.searches = [];
      this.time = {};
      this.setTime(min, max);
      this._accessCount = 0;
    }

    setTime(min, max) {
      this._min = min;
      this._max = max;
    }

    calculateBounds() {
      this._accessCount++;
      return {
        min: { valueOf: () => this._min },
        max: { valueOf: () => this._max },
      };
    }
  }

  class FauxTime {
    constructor() {
      this._time = 10000;
      this._accessCount = 0;
    }

    now() {
      this._accessCount++;
      return this._time;
    }

    increment(inc) {
      this._time += inc;
    }
  }

  it(`sequence`, async () => {
    const timefilter = new FauxTimefilter(10000, 20000, 'quick');
    const tc = new TimeCache(timefilter, 5000);
    const time = new FauxTime();
    tc._now = () => time.now();

    let timeAccess = 0;
    let filterAccess = 0;

    // first call - gets bounds
    expect(tc.getTimeBounds()).to.eql({ min: 10000, max: 20000 });
    expect(time._accessCount).to.be(++timeAccess);
    expect(timefilter._accessCount).to.be(++filterAccess);

    // short diff, same result
    time.increment(10);
    timefilter.setTime(10010, 20010);
    expect(tc.getTimeBounds()).to.eql({ min: 10000, max: 20000 });
    expect(time._accessCount).to.be(++timeAccess);
    expect(timefilter._accessCount).to.be(filterAccess);

    // longer diff, gets bounds but returns original
    time.increment(200);
    timefilter.setTime(10210, 20210);
    expect(tc.getTimeBounds()).to.eql({ min: 10000, max: 20000 });
    expect(time._accessCount).to.be(++timeAccess);
    expect(timefilter._accessCount).to.be(++filterAccess);

    // long diff, new result
    time.increment(10000);
    timefilter.setTime(20220, 30220);
    expect(tc.getTimeBounds()).to.eql({ min: 20220, max: 30220 });
    expect(time._accessCount).to.be(++timeAccess);
    expect(timefilter._accessCount).to.be(++filterAccess);

  });

});
