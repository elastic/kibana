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

jest.mock('ui/chrome',
  () => ({
    getBasePath: () => `/some/base/path`,
    getUiSettingsClient: () => {
      return {
        get: (key) => {
          switch (key) {
            case 'timepicker:timeDefaults':
              return { from: 'now-15m', to: 'now' };
            case 'timepicker:refreshIntervalDefaults':
              return { pause: false, value: 0 };
            default:
              throw new Error(`Unexpected config key: ${key}`);
          }
        }
      };
    },
  }), { virtual: true });

jest.mock('ui/timefilter/lib/parse_querystring',
  () => ({
    parseQueryString: () => {
      return {
        // Can not access local variable from within a mock
        forceNow: global.nowTime
      };
    },
  }), { virtual: true });

import sinon from 'sinon';
import expect from '@kbn/expect';
import moment from 'moment';
import { timefilter } from './timefilter';

function stubNowTime(nowTime) {
  global.nowTime = nowTime;
}

function clearNowTimeStub() {
  delete global.nowTime;
}

describe('setTime', () => {
  let update;
  let fetch;

  beforeEach(() => {
    update = sinon.spy();
    fetch = sinon.spy();
    timefilter.setTime({
      from: 0,
      to: 1,
    });
    timefilter.on('timeUpdate', update);
    timefilter.on('fetch', fetch);
  });

  test('should update time', () => {
    timefilter.setTime({ from: 5, to: 10 });
    expect(timefilter.getTime()).to.eql({ from: 5, to: 10 });
  });

  test('should not add unexpected object keys to time state', () => {
    const unexpectedKey = 'unexpectedKey';
    timefilter.setTime({ from: 5, to: 10, [unexpectedKey]: 'I should not be added to time state' });
    expect(timefilter.getTime()).not.to.have.property(unexpectedKey);
  });

  test('should allow partial updates to time', () => {
    timefilter.setTime({ from: 5, to: 10 });
    expect(timefilter.getTime()).to.eql({ from: 5, to: 10 });
  });

  test('not emit anything if the time has not changed', () => {
    timefilter.setTime({ from: 0, to: 1 });
    expect(update.called).to.be(false);
    expect(fetch.called).to.be(false);
  });

  test('emit update and fetch if the time has changed', () => {
    timefilter.setTime({ from: 5, to: 10 });
    expect(update.called).to.be(true);
    expect(fetch.called).to.be(true);
  });

  test('should return strings and not moment objects', () => {
    const from = moment().subtract(15, 'minutes');
    const to = moment();
    timefilter.setTime({ to, from });
    expect(timefilter.getTime()).to.eql({
      from: from.toISOString(),
      to: to.toISOString(),
    });
  });
});

describe('setRefreshInterval', () => {

  let update;
  let fetch;

  beforeEach(() => {
    update = sinon.spy();
    fetch = sinon.spy();
    timefilter.setRefreshInterval({
      pause: false,
      value: 0
    });
    timefilter.on('refreshIntervalUpdate', update);
    timefilter.on('fetch', fetch);
  });

  test('should update refresh interval', () => {
    timefilter.setRefreshInterval({ pause: true, value: 10 });
    expect(timefilter.getRefreshInterval()).to.eql({ pause: true, value: 10 });
  });

  test('should not add unexpected object keys to refreshInterval state', () => {
    const unexpectedKey = 'unexpectedKey';
    timefilter.setRefreshInterval({ pause: true, value: 10, [unexpectedKey]: 'I should not be added to refreshInterval state' });
    expect(timefilter.getRefreshInterval()).not.to.have.property(unexpectedKey);
  });

  test('should allow partial updates to refresh interval', () => {
    timefilter.setRefreshInterval({ value: 10 });
    expect(timefilter.getRefreshInterval()).to.eql({ pause: true, value: 10 });
  });

  test('should not allow negative intervals', () => {
    timefilter.setRefreshInterval({ value: -10 });
    expect(timefilter.getRefreshInterval()).to.eql({ pause: true, value: 0 });
  });

  test('should set pause to true when interval is zero', () => {
    timefilter.setRefreshInterval({ value: 0, pause: false });
    expect(timefilter.getRefreshInterval()).to.eql({ pause: true, value: 0 });
  });

  test('not emit anything if nothing has changed', () => {
    timefilter.setRefreshInterval({ pause: false, value: 0 });
    expect(update.called).to.be(false);
    expect(fetch.called).to.be(false);
  });

  test('emit only an update when paused', () => {
    timefilter.setRefreshInterval({ pause: true, value: 5000 });
    expect(update.called).to.be(true);
    expect(fetch.called).to.be(false);
  });

  test('emit update, not fetch, when switching to value: 0', () => {
    timefilter.setRefreshInterval({ pause: false, value: 5000 });
    expect(update.calledOnce).to.be(true);
    expect(fetch.calledOnce).to.be(true);

    timefilter.setRefreshInterval({ pause: false, value: 0 });
    expect(update.calledTwice).to.be(true);
    expect(fetch.calledTwice).to.be(false);
  });

  test('should emit update, not fetch, when moving from unpaused to paused', () => {
    timefilter.setRefreshInterval({ pause: false, value: 5000 });
    expect(update.calledOnce).to.be(true);
    expect(fetch.calledOnce).to.be(true);

    timefilter.setRefreshInterval({ pause: true, value: 5000 });
    expect(update.calledTwice).to.be(true);
    expect(fetch.calledTwice).to.be(false);
  });

  test('should emit update and fetch when unpaused', () => {
    timefilter.setRefreshInterval({ pause: true, value: 5000 });
    expect(update.calledOnce).to.be(true);
    expect(fetch.calledOnce).to.be(false);

    timefilter.setRefreshInterval({ pause: false, value: 5000 });
    expect(update.calledTwice).to.be(true);
    expect(fetch.calledOnce).to.be(true);
  });

});

describe('isTimeRangeSelectorEnabled', () => {
  let update;

  beforeEach(() => {
    update = sinon.spy();
    timefilter.on('enabledUpdated', update);
  });

  test('should emit updated when disabled', () => {
    timefilter.disableTimeRangeSelector();
    expect(timefilter.isTimeRangeSelectorEnabled).to.be(false);
    expect(update.called).to.be(true);
  });

  test('should emit updated when enabled', () => {
    timefilter.enableTimeRangeSelector();
    expect(timefilter.isTimeRangeSelectorEnabled).to.be(true);
    expect(update.called).to.be(true);
  });
});

describe('isAutoRefreshSelectorEnabled', () => {
  let update;

  beforeEach(() => {
    update = sinon.spy();
    timefilter.on('enabledUpdated', update);
  });

  test('should emit updated when disabled', () => {
    timefilter.disableAutoRefreshSelector();
    expect(timefilter.isAutoRefreshSelectorEnabled).to.be(false);
    expect(update.called).to.be(true);
  });

  test('should emit updated when enabled', () => {
    timefilter.enableAutoRefreshSelector();
    expect(timefilter.isAutoRefreshSelectorEnabled).to.be(true);
    expect(update.called).to.be(true);
  });
});

describe('calculateBounds', () => {

  const fifteenMinutesInMilliseconds = 15 * 60 * 1000;
  const clockNowTicks = new Date(2000, 1, 1, 0, 0, 0, 0).valueOf();

  let clock;

  beforeEach(() => {
    clock = sinon.useFakeTimers(clockNowTicks);
  });

  afterEach(() => {
    clock.restore();
    clearNowTimeStub();
  });

  test('uses clock time by default', () => {
    const timeRange = {
      from: 'now-15m',
      to: 'now'
    };

    stubNowTime(undefined);
    const result = timefilter.calculateBounds(timeRange);
    expect(result.min.valueOf()).to.eql(clockNowTicks - fifteenMinutesInMilliseconds);
    expect(result.max.valueOf()).to.eql(clockNowTicks);
  });

  test('uses forceNow string', () => {
    const timeRange = {
      from: 'now-15m',
      to: 'now'
    };

    const forceNowString = '1999-01-01T00:00:00.000Z';
    stubNowTime(forceNowString);
    const result = timefilter.calculateBounds(timeRange);

    const forceNowTicks = Date.parse(forceNowString);
    expect(result.min.valueOf()).to.eql(forceNowTicks - fifteenMinutesInMilliseconds);
    expect(result.max.valueOf()).to.eql(forceNowTicks);
  });

  test(`throws Error if forceNow can't be parsed`, () => {
    const timeRange = {
      from: 'now-15m',
      to: 'now'
    };

    stubNowTime('not_a_parsable_date');
    expect(() => timefilter.calculateBounds(timeRange)).to.throwError();
  });
});

