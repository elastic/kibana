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

import dateMath from '../src';
import moment from 'moment';
import sinon from 'sinon';
import expect from '@kbn/expect';

/**
 * Require a new instance of the moment library, bypassing the require cache.
 * This is needed, since we are trying to test whether or not this library works
 * when passing in a different configured moment instance. If we would change
 * the locales on the imported moment, it would automatically apply
 * to the source code, even without passing it in to the method, since they share
 * the same global state. This method avoids this, by loading a separate instance
 * of moment, by deleting the require cache and require the library again.
 */
function momentClone() {
  delete require.cache[require.resolve('moment')];
  return require('moment');
}

describe('dateMath', function() {
  // Test each of these intervals when testing relative time
  const spans = ['s', 'm', 'h', 'd', 'w', 'M', 'y', 'ms'];
  const anchor = '2014-01-01T06:06:06.666Z';
  const anchoredDate = new Date(Date.parse(anchor));
  const unix = moment(anchor).valueOf();
  const format = 'YYYY-MM-DDTHH:mm:ss.SSSZ';
  let clock;

  describe('errors', function() {
    it('should return undefined if passed something falsy', function() {
      expect(dateMath.parse()).to.be(undefined);
    });

    it('should return undefined if I pass an operator besides [+-/]', function() {
      expect(dateMath.parse('now&1d')).to.be(undefined);
    });

    it('should return undefined if I pass a unit besides' + spans.toString(), function() {
      expect(dateMath.parse('now+5f')).to.be(undefined);
    });

    it('should return undefined if rounding unit is not 1', function() {
      expect(dateMath.parse('now/2y')).to.be(undefined);
      expect(dateMath.parse('now/0.5y')).to.be(undefined);
    });

    it('should not go into an infinite loop when missing a unit', function() {
      expect(dateMath.parse('now-0')).to.be(undefined);
      expect(dateMath.parse('now-00')).to.be(undefined);
      expect(dateMath.parse('now-000')).to.be(undefined);
    });

    describe('forceNow', function() {
      it('should throw an Error if passed a string', function() {
        const fn = () => dateMath.parse('now', { forceNow: '2000-01-01T00:00:00.000Z' });
        expect(fn).to.throwError();
      });

      it('should throw an Error if passed a moment', function() {
        expect(() => dateMath.parse('now', { forceNow: moment() })).to.throwError();
      });

      it('should throw an Error if passed an invalid date', function() {
        expect(() => dateMath.parse('now', { forceNow: new Date('foobar') })).to.throwError();
      });
    });
  });

  describe('objects and strings', function() {
    let mmnt;
    let date;
    let string;
    let now;

    beforeEach(function() {
      clock = sinon.useFakeTimers(unix);
      now = moment();
      mmnt = moment(anchor);
      date = mmnt.toDate();
      string = mmnt.format(format);
    });

    afterEach(function() {
      clock.restore();
    });

    it('should return the same moment if passed a moment', function() {
      expect(dateMath.parse(mmnt)).to.eql(mmnt);
    });

    it('should return a moment if passed a date', function() {
      expect(dateMath.parse(date).format(format)).to.eql(mmnt.format(format));
    });

    it('should return a moment if passed an ISO8601 string', function() {
      expect(dateMath.parse(string).format(format)).to.eql(mmnt.format(format));
    });

    it('should return the current time when parsing now', function() {
      expect(dateMath.parse('now').format(format)).to.eql(now.format(format));
    });

    it('should use the forceNow parameter when parsing now', function() {
      expect(dateMath.parse('now', { forceNow: anchoredDate }).valueOf()).to.eql(unix);
    });
  });

  describe('subtraction', function() {
    let now;
    let anchored;

    beforeEach(function() {
      clock = sinon.useFakeTimers(unix);
      now = moment();
      anchored = moment(anchor);
    });

    afterEach(function() {
      clock.restore();
    });

    [5, 12, 247].forEach(len => {
      spans.forEach(span => {
        const nowEx = `now-${len}${span}`;
        const thenEx = `${anchor}||-${len}${span}`;

        it('should return ' + len + span + ' ago', function() {
          const parsed = dateMath.parse(nowEx).format(format);
          expect(parsed).to.eql(now.subtract(len, span).format(format));
        });

        it('should return ' + len + span + ' before ' + anchor, function() {
          const parsed = dateMath.parse(thenEx).format(format);
          expect(parsed).to.eql(anchored.subtract(len, span).format(format));
        });

        it('should return ' + len + span + ' before forceNow', function() {
          const parsed = dateMath.parse(nowEx, { forceNow: anchoredDate }).valueOf();
          expect(parsed).to.eql(anchored.subtract(len, span).valueOf());
        });
      });
    });
  });

  describe('addition', function() {
    let now;
    let anchored;

    beforeEach(function() {
      clock = sinon.useFakeTimers(unix);
      now = moment();
      anchored = moment(anchor);
    });

    afterEach(function() {
      clock.restore();
    });

    [5, 12, 247].forEach(len => {
      spans.forEach(span => {
        const nowEx = `now+${len}${span}`;
        const thenEx = `${anchor}||+${len}${span}`;

        it('should return ' + len + span + ' from now', function() {
          expect(dateMath.parse(nowEx).format(format)).to.eql(now.add(len, span).format(format));
        });

        it('should return ' + len + span + ' after ' + anchor, function() {
          expect(dateMath.parse(thenEx).format(format)).to.eql(
            anchored.add(len, span).format(format)
          );
        });

        it('should return ' + len + span + ' after forceNow', function() {
          expect(dateMath.parse(nowEx, { forceNow: anchoredDate }).valueOf()).to.eql(
            anchored.add(len, span).valueOf()
          );
        });
      });
    });
  });

  describe('rounding', function() {
    let now;
    let anchored;

    beforeEach(function() {
      clock = sinon.useFakeTimers(unix);
      now = moment();
      anchored = moment(anchor);
    });

    afterEach(function() {
      clock.restore();
    });

    spans.forEach(span => {
      it(`should round now to the beginning of the ${span}`, function() {
        expect(dateMath.parse('now/' + span).format(format)).to.eql(
          now.startOf(span).format(format)
        );
      });

      it(`should round now to the beginning of forceNow's ${span}`, function() {
        expect(dateMath.parse('now/' + span, { forceNow: anchoredDate }).valueOf()).to.eql(
          anchored.startOf(span).valueOf()
        );
      });

      it(`should round now to the end of the ${span}`, function() {
        expect(dateMath.parse('now/' + span, { roundUp: true }).format(format)).to.eql(
          now.endOf(span).format(format)
        );
      });

      it(`should round now to the end of forceNow's ${span}`, function() {
        expect(
          dateMath.parse('now/' + span, { roundUp: true, forceNow: anchoredDate }).valueOf()
        ).to.eql(anchored.endOf(span).valueOf());
      });
    });
  });

  describe('math and rounding', function() {
    let now;
    let anchored;

    beforeEach(function() {
      clock = sinon.useFakeTimers(unix);
      now = moment();
      anchored = moment(anchor);
    });

    afterEach(function() {
      clock.restore();
    });

    it('should round to the nearest second with 0 value', function() {
      const val = dateMath.parse('now-0s/s').format(format);
      expect(val).to.eql(now.startOf('s').format(format));
    });

    it('should subtract 17s, rounded to the nearest second', function() {
      const val = dateMath.parse('now-17s/s').format(format);
      expect(val).to.eql(
        now
          .startOf('s')
          .subtract(17, 's')
          .format(format)
      );
    });

    it('should add 555ms, rounded to the nearest millisecond', function() {
      const val = dateMath.parse('now+555ms/ms').format(format);
      expect(val).to.eql(
        now
          .add(555, 'ms')
          .startOf('ms')
          .format(format)
      );
    });

    it('should subtract 555ms, rounded to the nearest second', function() {
      const val = dateMath.parse('now-555ms/s').format(format);
      expect(val).to.eql(
        now
          .subtract(555, 'ms')
          .startOf('s')
          .format(format)
      );
    });

    it('should round weeks to Sunday by default', function() {
      const val = dateMath.parse('now-1w/w');
      expect(val.isoWeekday()).to.eql(7);
    });

    it('should round weeks based on the passed moment locale start of week setting', function() {
      const m = momentClone();
      // Define a locale, that has Tuesday as beginning of the week
      m.defineLocale('x-test', {
        week: { dow: 2 },
      });
      const val = dateMath.parse('now-1w/w', { momentInstance: m });
      expect(val.isoWeekday()).to.eql(2);
    });

    it('should round up weeks based on the passed moment locale start of week setting', function() {
      const m = momentClone();
      // Define a locale, that has Tuesday as beginning of the week
      m.defineLocale('x-test', {
        week: { dow: 3 },
      });
      const val = dateMath.parse('now-1w/w', {
        roundUp: true,
        momentInstance: m,
      });
      // The end of the range (rounding up) should be the last day of the week (so one day before)
      // our start of the week, that's why 3 - 1
      expect(val.isoWeekday()).to.eql(3 - 1);
    });

    it('should round relative to forceNow', function() {
      const val = dateMath.parse('now-0s/s', { forceNow: anchoredDate }).valueOf();
      expect(val).to.eql(anchored.startOf('s').valueOf());
    });

    it('should parse long expressions', () => {
      expect(dateMath.parse('now-1d/d+8h+50m')).to.be.ok();
    });
  });

  describe('used momentjs instance', function() {
    it('should use the default moment instance if parameter not specified', function() {
      const momentSpy = sinon.spy(moment, 'isMoment');
      dateMath.parse('now');
      expect(momentSpy.called).to.be(true);
      momentSpy.restore();
    });

    it('should not use default moment instance if parameter is specified', function() {
      const m = momentClone();
      const momentSpy = sinon.spy(moment, 'isMoment');
      const cloneSpy = sinon.spy(m, 'isMoment');
      dateMath.parse('now', { momentInstance: m });
      expect(momentSpy.called).to.be(false);
      expect(cloneSpy.called).to.be(true);
      momentSpy.restore();
      cloneSpy.restore();
    });

    it('should work with multiple different instances', function() {
      const m1 = momentClone();
      const m2 = momentClone();
      const m1Spy = sinon.spy(m1, 'isMoment');
      const m2Spy = sinon.spy(m2, 'isMoment');
      dateMath.parse('now', { momentInstance: m1 });
      expect(m1Spy.called).to.be(true);
      expect(m2Spy.called).to.be(false);
      m1Spy.resetHistory();
      m2Spy.resetHistory();
      dateMath.parse('now', { momentInstance: m2 });
      expect(m1Spy.called).to.be(false);
      expect(m2Spy.called).to.be(true);
      m1Spy.restore();
      m2Spy.restore();
    });

    it('should use global instance after passing an instance', function() {
      const m = momentClone();
      const momentSpy = sinon.spy(moment, 'isMoment');
      const cloneSpy = sinon.spy(m, 'isMoment');
      dateMath.parse('now', { momentInstance: m });
      expect(momentSpy.called).to.be(false);
      expect(cloneSpy.called).to.be(true);
      momentSpy.resetHistory();
      cloneSpy.resetHistory();
      dateMath.parse('now');
      expect(momentSpy.called).to.be(true);
      expect(cloneSpy.called).to.be(false);
      momentSpy.restore();
      cloneSpy.restore();
    });
  });

  describe('units', function() {
    it('should have units descending for unitsDesc', function() {
      expect(dateMath.unitsDesc).to.eql(['y', 'M', 'w', 'd', 'h', 'm', 's', 'ms']);
    });

    it('should have units ascending for unitsAsc', function() {
      expect(dateMath.unitsAsc).to.eql(['ms', 's', 'm', 'h', 'd', 'w', 'M', 'y']);
    });
  });
});
