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

jest.useFakeTimers();

jest.mock('./lib/parse_querystring', () => ({
  parseQueryString: () => {
    return {
      // Can not access local variable from within a mock
      // @ts-ignore
      forceNow: global.nowTime,
    };
  },
}));

import sinon from 'sinon';
import moment from 'moment';
import { Timefilter } from './timefilter';
import { Subscription } from 'rxjs';
import { TimeRange, RefreshInterval } from '../../../common';

import { timefilterServiceMock } from './timefilter_service.mock';
const timefilterSetupMock = timefilterServiceMock.createSetupContract();

const timefilterConfig = {
  timeDefaults: { from: 'now-15m', to: 'now' },
  refreshIntervalDefaults: { pause: false, value: 0 },
};
const timefilter = new Timefilter(timefilterConfig, timefilterSetupMock.history);

function stubNowTime(nowTime: any) {
  // @ts-ignore
  global.nowTime = nowTime;
}

function clearNowTimeStub() {
  // @ts-ignore
  delete global.nowTime;
}

describe('setTime', () => {
  let update: sinon.SinonSpy;
  let fetch: sinon.SinonSpy;
  let updateSub: Subscription;
  let fetchSub: Subscription;

  beforeEach(() => {
    update = sinon.spy();
    fetch = sinon.spy();
    timefilter.setTime({
      from: '0',
      to: '1',
    });
    updateSub = timefilter.getTimeUpdate$().subscribe(update);
    fetchSub = timefilter.getFetch$().subscribe(fetch);
  });

  afterEach(() => {
    updateSub.unsubscribe();
    fetchSub.unsubscribe();
  });

  test('should update time', () => {
    timefilter.setTime({ from: '5', to: '10' });
    expect(timefilter.getTime()).toEqual({
      from: '5',
      to: '10',
    });
  });

  test('should not add unexpected object keys to time state', () => {
    const unexpectedKey = 'unexpectedKey';
    timefilter.setTime({
      from: '5',
      to: '10',
      [unexpectedKey]: 'I should not be added to time state',
    } as TimeRange);
    expect(timefilter.getTime()).not.toHaveProperty(unexpectedKey);
  });

  test('should allow partial updates to time', () => {
    timefilter.setTime({ from: '5', to: '10' });
    expect(timefilter.getTime()).toEqual({ from: '5', to: '10' });
  });

  test('not emit anything if the time has not changed', () => {
    timefilter.setTime({ from: '0', to: '1' });
    expect(update.called).toBe(false);
    expect(fetch.called).toBe(false);
  });

  test('emit update and fetch if the time has changed', () => {
    timefilter.setTime({ from: '5', to: '10' });
    expect(update.called).toBe(true);
    expect(fetch.called).toBe(true);
  });

  test('should return strings and not moment objects', () => {
    const from = moment().subtract(15, 'minutes');
    const to = moment();
    timefilter.setTime({ to, from });
    expect(timefilter.getTime()).toEqual({
      from: from.toISOString(),
      to: to.toISOString(),
    });
  });
});

describe('setRefreshInterval', () => {
  let update: sinon.SinonSpy;
  let fetch: sinon.SinonSpy;
  let autoRefreshFetch: sinon.SinonSpy;
  let fetchSub: Subscription;
  let refreshSub: Subscription;
  let autoRefreshSub: Subscription;

  beforeEach(() => {
    update = sinon.spy();
    fetch = sinon.spy();
    autoRefreshFetch = sinon.spy();
    timefilter.setRefreshInterval({
      pause: false,
      value: 0,
    });
    refreshSub = timefilter.getRefreshIntervalUpdate$().subscribe(update);
    fetchSub = timefilter.getFetch$().subscribe(fetch);
    autoRefreshSub = timefilter.getAutoRefreshFetch$().subscribe(autoRefreshFetch);
  });

  afterEach(() => {
    refreshSub.unsubscribe();
    fetchSub.unsubscribe();
    autoRefreshSub.unsubscribe();
  });

  test('should update refresh interval', () => {
    timefilter.setRefreshInterval({ pause: true, value: 10 });
    expect(timefilter.getRefreshInterval()).toEqual({ pause: true, value: 10 });
  });

  test('should not add unexpected object keys to refreshInterval state', () => {
    const unexpectedKey = 'unexpectedKey';
    timefilter.setRefreshInterval({
      pause: true,
      value: 10,
      [unexpectedKey]: 'I should not be added to refreshInterval state',
    } as RefreshInterval);
    expect(timefilter.getRefreshInterval()).not.toHaveProperty(unexpectedKey);
  });

  test('should allow partial updates to refresh interval', () => {
    timefilter.setRefreshInterval({ value: 10 });
    expect(timefilter.getRefreshInterval()).toEqual({ pause: true, value: 10 });
  });

  test('should not allow negative intervals', () => {
    timefilter.setRefreshInterval({ value: -10 });
    expect(timefilter.getRefreshInterval()).toEqual({ pause: true, value: 0 });
  });

  test('should set pause to true when interval is zero', () => {
    timefilter.setRefreshInterval({ value: 0, pause: false });
    expect(timefilter.getRefreshInterval()).toEqual({ pause: true, value: 0 });
  });

  test('not emit anything if nothing has changed', () => {
    timefilter.setRefreshInterval({ pause: false, value: 0 });
    expect(update.called).toBe(false);
    expect(fetch.called).toBe(false);
  });

  test('emit only an update when paused', () => {
    timefilter.setRefreshInterval({ pause: true, value: 5000 });
    expect(update.called).toBe(true);
    expect(fetch.called).toBe(false);
  });

  test('emit update, not fetch, when switching to value: 0', () => {
    timefilter.setRefreshInterval({ pause: false, value: 5000 });
    expect(update.calledOnce).toBe(true);
    expect(fetch.calledOnce).toBe(true);

    timefilter.setRefreshInterval({ pause: false, value: 0 });
    expect(update.calledTwice).toBe(true);
    expect(fetch.calledTwice).toBe(false);
  });

  test('should emit update, not fetch, when moving from unpaused to paused', () => {
    timefilter.setRefreshInterval({ pause: false, value: 5000 });
    expect(update.calledOnce).toBe(true);
    expect(fetch.calledOnce).toBe(true);

    timefilter.setRefreshInterval({ pause: true, value: 5000 });
    expect(update.calledTwice).toBe(true);
    expect(fetch.calledTwice).toBe(false);
  });

  test('should emit update and fetch when unpaused', () => {
    timefilter.setRefreshInterval({ pause: true, value: 5000 });
    expect(update.calledOnce).toBe(true);
    expect(fetch.calledOnce).toBe(false);

    timefilter.setRefreshInterval({ pause: false, value: 5000 });
    expect(update.calledTwice).toBe(true);
    expect(fetch.calledOnce).toBe(true);
  });

  test('should start auto refresh when unpaused', () => {
    timefilter.setRefreshInterval({ pause: false, value: 1000 });
    expect(autoRefreshFetch.callCount).toBe(0);
    jest.advanceTimersByTime(1000);
    expect(autoRefreshFetch.callCount).toBe(1);
    jest.advanceTimersByTime(1000);
    expect(autoRefreshFetch.callCount).toBe(2);
  });

  test('should stop auto refresh when paused', () => {
    timefilter.setRefreshInterval({ pause: true, value: 1000 });
    expect(autoRefreshFetch.callCount).toBe(0);
    jest.advanceTimersByTime(1000);
    expect(autoRefreshFetch.callCount).toBe(0);
  });

  test('should not keep old interval when updated', () => {
    timefilter.setRefreshInterval({ pause: false, value: 1000 });
    expect(autoRefreshFetch.callCount).toBe(0);
    jest.advanceTimersByTime(1000);
    expect(autoRefreshFetch.callCount).toBe(1);
    timefilter.setRefreshInterval({ pause: false, value: 2000 });
    jest.advanceTimersByTime(2000);
    expect(autoRefreshFetch.callCount).toBe(2);
  });
});

describe('isTimeRangeSelectorEnabled', () => {
  let update: sinon.SinonSpy;
  let updateSub: Subscription;

  beforeEach(() => {
    update = sinon.spy();
    updateSub = timefilter.getEnabledUpdated$().subscribe(update);
  });

  afterEach(() => {
    updateSub.unsubscribe();
  });

  test('should emit updated when disabled', () => {
    timefilter.disableTimeRangeSelector();
    expect(timefilter.isTimeRangeSelectorEnabled()).toBe(false);
    expect(update.called).toBe(true);
  });

  test('should emit updated when enabled', () => {
    timefilter.enableTimeRangeSelector();
    expect(timefilter.isTimeRangeSelectorEnabled()).toBe(true);
    expect(update.called).toBe(true);
  });
});

describe('isAutoRefreshSelectorEnabled', () => {
  let update: sinon.SinonSpy;
  let updateSub: Subscription;

  beforeEach(() => {
    update = sinon.spy();
    updateSub = timefilter.getEnabledUpdated$().subscribe(update);
  });

  afterEach(() => {
    updateSub.unsubscribe();
  });

  test('should emit updated when disabled', () => {
    timefilter.disableAutoRefreshSelector();
    expect(timefilter.isAutoRefreshSelectorEnabled()).toBe(false);
    expect(update.called).toBe(true);
  });

  test('should emit updated when enabled', () => {
    timefilter.enableAutoRefreshSelector();
    expect(timefilter.isAutoRefreshSelectorEnabled()).toBe(true);
    expect(update.called).toBe(true);
  });
});

describe('calculateBounds', () => {
  const fifteenMinutesInMilliseconds = 15 * 60 * 1000;
  const clockNowTicks = new Date(2000, 1, 1, 0, 0, 0, 0).valueOf();

  let clock: sinon.SinonFakeTimers;

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
      to: 'now',
    };

    stubNowTime(undefined);
    const result = timefilter.calculateBounds(timeRange);
    expect(result.min && result.min.valueOf()).toEqual(
      clockNowTicks - fifteenMinutesInMilliseconds
    );
    expect(result.max && result.max.valueOf()).toEqual(clockNowTicks);
  });

  test('uses forceNow string', () => {
    const timeRange = {
      from: 'now-15m',
      to: 'now',
    };

    const forceNowString = '1999-01-01T00:00:00.000Z';
    stubNowTime(forceNowString);
    const result = timefilter.calculateBounds(timeRange);

    const forceNowTicks = Date.parse(forceNowString);
    expect(result.min && result.min.valueOf()).toEqual(
      forceNowTicks - fifteenMinutesInMilliseconds
    );
    expect(result.max && result.max.valueOf()).toEqual(forceNowTicks);
  });

  test(`throws Error if forceNow can't be parsed`, () => {
    const timeRange = {
      from: 'now-15m',
      to: 'now',
    };

    stubNowTime('not_a_parsable_date');
    expect(() => timefilter.calculateBounds(timeRange)).toThrowError();
  });
});
