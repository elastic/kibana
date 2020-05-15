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

import d3 from 'd3';
import moment from 'moment-timezone';
import { timeTicks } from './time_ticks';

const timezonesToTest = [
  'Asia/Tokyo',
  'Europe/Berlin',
  'UTC',
  'America/New York',
  'America/Los_Angeles',
];

describe('timeTicks', () => {
  let scale;

  beforeEach(() => {
    scale = d3.time.scale.utc();
  });

  afterEach(() => {
    moment.tz.setDefault();
  });

  timezonesToTest.map(tz => {
    describe(`standard tests in ${tz}`, () => {
      beforeEach(() => {
        moment.tz.setDefault(tz);
      });

      it('should return nice daily ticks', () => {
        scale.domain([
          moment('2019-04-04 00:00:00').valueOf(),
          moment('2019-04-08 00:00:00').valueOf(),
        ]);
        const tickFn = timeTicks(scale);
        const ticks = tickFn(5);

        expect(ticks).toEqual([
          moment('2019-04-04 00:00:00').valueOf(),
          moment('2019-04-05 00:00:00').valueOf(),
          moment('2019-04-06 00:00:00').valueOf(),
          moment('2019-04-07 00:00:00').valueOf(),
          moment('2019-04-08 00:00:00').valueOf(),
        ]);
      });

      it('should return nice hourly ticks', () => {
        scale.domain([
          moment('2019-04-04 00:00:00').valueOf(),
          moment('2019-04-04 04:00:00').valueOf(),
        ]);
        const tickFn = timeTicks(scale);
        const ticks = tickFn(5);

        expect(ticks).toEqual([
          moment('2019-04-04 00:00:00').valueOf(),
          moment('2019-04-04 01:00:00').valueOf(),
          moment('2019-04-04 02:00:00').valueOf(),
          moment('2019-04-04 03:00:00').valueOf(),
          moment('2019-04-04 04:00:00').valueOf(),
        ]);
      });

      it('should return nice yearly ticks', () => {
        scale.domain([
          moment('2010-04-04 00:00:00').valueOf(),
          moment('2019-04-04 04:00:00').valueOf(),
        ]);
        const tickFn = timeTicks(scale);
        const ticks = tickFn(9);

        expect(ticks).toEqual([
          moment('2011-01-01 00:00:00').valueOf(),
          moment('2012-01-01 00:00:00').valueOf(),
          moment('2013-01-01 00:00:00').valueOf(),
          moment('2014-01-01 00:00:00').valueOf(),
          moment('2015-01-01 00:00:00').valueOf(),
          moment('2016-01-01 00:00:00').valueOf(),
          moment('2017-01-01 00:00:00').valueOf(),
          moment('2018-01-01 00:00:00').valueOf(),
          moment('2019-01-01 00:00:00').valueOf(),
        ]);
      });

      it('should return nice yearly ticks from leap year to leap year', () => {
        scale.domain([
          moment('2016-02-29 00:00:00').valueOf(),
          moment('2020-04-29 00:00:00').valueOf(),
        ]);

        const tickFn = timeTicks(scale);
        const ticks = tickFn(4);

        expect(ticks).toEqual([
          moment('2017-01-01 00:00:00').valueOf(),
          moment('2018-01-01 00:00:00').valueOf(),
          moment('2019-01-01 00:00:00').valueOf(),
          moment('2020-01-01 00:00:00').valueOf(),
        ]);
      });
    });
  });

  describe('dst switch', () => {
    it('should not leave gaps in hourly ticks on dst switch winter to summer time', () => {
      moment.tz.setDefault('Europe/Berlin');

      scale.domain([
        moment('2019-03-31 01:00:00').valueOf(),
        moment('2019-03-31 03:00:00').valueOf(),
      ]);

      const tickFn = timeTicks(scale);
      const ticks = tickFn(5);

      expect(ticks).toEqual([
        moment('2019-03-31 01:00:00').valueOf(),
        moment('2019-03-31 01:15:00').valueOf(),
        moment('2019-03-31 01:30:00').valueOf(),
        moment('2019-03-31 01:45:00').valueOf(),
        moment('2019-03-31 03:00:00').valueOf(),
      ]);
    });

    it('should not leave gaps in hourly ticks on dst switch summer to winter time', () => {
      moment.tz.setDefault('Europe/Berlin');

      scale.domain([
        moment('2019-10-27 02:00:00').valueOf(),
        moment('2019-10-27 05:00:00').valueOf(),
      ]);

      const tickFn = timeTicks(scale);
      const ticks = tickFn(5);

      expect(ticks).toEqual([
        moment('2019-10-27 02:00:00').valueOf(),
        // this is the "first" 3 o'clock still in summer time
        moment('2019-10-27 03:00:00+02:00').valueOf(),
        moment('2019-10-27 03:00:00').valueOf(),
        moment('2019-10-27 04:00:00').valueOf(),
        moment('2019-10-27 05:00:00').valueOf(),
      ]);
    });

    it('should set nice daily ticks on dst switch summer to winter time', () => {
      moment.tz.setDefault('Europe/Berlin');

      scale.domain([
        moment('2019-10-25 16:00:00').valueOf(),
        moment('2019-10-30 08:00:00').valueOf(),
      ]);

      const tickFn = timeTicks(scale);
      const ticks = tickFn(5);

      expect(ticks).toEqual([
        moment('2019-10-26 00:00:00').valueOf(),
        moment('2019-10-27 00:00:00').valueOf(),
        moment('2019-10-28 00:00:00').valueOf(),
        moment('2019-10-29 00:00:00').valueOf(),
        moment('2019-10-30 00:00:00').valueOf(),
      ]);
    });

    it('should set nice daily ticks on dst switch winter to summer time', () => {
      moment.tz.setDefault('Europe/Berlin');

      scale.domain([
        moment('2019-03-29 16:00:00').valueOf(),
        moment('2019-04-03 08:00:00').valueOf(),
      ]);

      const tickFn = timeTicks(scale);
      const ticks = tickFn(5);

      expect(ticks).toEqual([
        moment('2019-03-30 00:00:00').valueOf(),
        moment('2019-03-31 00:00:00').valueOf(),
        moment('2019-04-01 00:00:00').valueOf(),
        moment('2019-04-02 00:00:00').valueOf(),
        moment('2019-04-03 00:00:00').valueOf(),
      ]);
    });

    it('should set nice monthly ticks on two dst switches from winter to winter time', () => {
      moment.tz.setDefault('Europe/Berlin');

      scale.domain([
        moment('2019-03-29 00:00:00').valueOf(),
        moment('2019-11-01 00:00:00').valueOf(),
      ]);

      const tickFn = timeTicks(scale);
      const ticks = tickFn(8);

      expect(ticks).toEqual([
        moment('2019-04-01 00:00:00').valueOf(),
        moment('2019-05-01 00:00:00').valueOf(),
        moment('2019-06-01 00:00:00').valueOf(),
        moment('2019-07-01 00:00:00').valueOf(),
        moment('2019-08-01 00:00:00').valueOf(),
        moment('2019-09-01 00:00:00').valueOf(),
        moment('2019-10-01 00:00:00').valueOf(),
        moment('2019-11-01 00:00:00').valueOf(),
      ]);
    });

    it('should set nice monthly ticks on two dst switches from summer to summer time', () => {
      moment.tz.setDefault('Europe/Berlin');

      scale.domain([
        moment('2018-10-26 00:00:00').valueOf(),
        moment('2019-03-31 20:00:00').valueOf(),
      ]);

      const tickFn = timeTicks(scale);
      const ticks = tickFn(5);

      expect(ticks).toEqual([
        moment('2018-11-01 00:00:00').valueOf(),
        moment('2018-12-01 00:00:00').valueOf(),
        moment('2019-01-01 00:00:00').valueOf(),
        moment('2019-02-01 00:00:00').valueOf(),
        moment('2019-03-01 00:00:00').valueOf(),
      ]);
    });
  });
});
