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
import expect from '@kbn/expect';
import moment from 'moment';
import { Timefilter } from './timefilter';
import { Subscription } from 'rxjs';
import { TimeRange, RefreshInterval } from 'src/plugins/data/public';

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
    expect(timefilter.getTime()).to.eql({
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
    expect(timefilter.getTime()).not.to.have.property(unexpectedKey);
  });

  test('should allow partial updates to time', () => {
    timefilter.setTime({ from: '5', to: '10' });
    expect(timefilter.getTime()).to.eql({ from: '5', to: '10' });
  });

  test('not emit anything if the time has not changed', () => {
    timefilter.setTime({ from: '0', to: '1' });
    expect(update.called).to.be(false);
    expect(fetch.called).to.be(false);
  });

  test('emit update and fetch if the time has changed', () => {
    timefilter.setTime({ from: '5', to: '10' });
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
    expect(timefilter.getRefreshInterval()).to.eql({ pause: true, value: 10 });
  });

  test('should not add unexpected object keys to refreshInterval state', () => {
    const unexpectedKey = 'unexpectedKey';
    timefilter.setRefreshInterval({
      pause: true,
      value: 10,
      [unexpectedKey]: 'I should not be added to refreshInterval state',
    } as RefreshInterval);
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

  test('should start auto refresh when unpaused', () => {
    timefilter.setRefreshInterval({ pause: false, value: 1000 });
    expect(autoRefreshFetch.callCount).to.be(0);
    jest.advanceTimersByTime(1000);
    expect(autoRefreshFetch.callCount).to.be(1);
    jest.advanceTimersByTime(1000);
    expect(autoRefreshFetch.callCount).to.be(2);
  });

  test('should stop auto refresh when paused', () => {
    timefilter.setRefreshInterval({ pause: true, value: 1000 });
    expect(autoRefreshFetch.callCount).to.be(0);
    jest.advanceTimersByTime(1000);
    expect(autoRefreshFetch.callCount).to.be(0);
  });

  test('should not keep old interval when updated', () => {
    timefilter.setRefreshInterval({ pause: false, value: 1000 });
    expect(autoRefreshFetch.callCount).to.be(0);
    jest.advanceTimersByTime(1000);
    expect(autoRefreshFetch.callCount).to.be(1);
    timefilter.setRefreshInterval({ pause: false, value: 2000 });
    jest.advanceTimersByTime(2000);
    expect(autoRefreshFetch.callCount).to.be(2);
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
    expect(timefilter.isTimeRangeSelectorEnabled()).to.be(false);
    expect(update.called).to.be(true);
  });

  test('should emit updated when enabled', () => {
    timefilter.enableTimeRangeSelector();
    expect(timefilter.isTimeRangeSelectorEnabled()).to.be(true);
    expect(update.called).to.be(true);
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
    expect(timefilter.isAutoRefreshSelectorEnabled()).to.be(false);
    expect(update.called).to.be(true);
  });

  test('should emit updated when enabled', () => {
    timefilter.enableAutoRefreshSelector();
    expect(timefilter.isAutoRefreshSelectorEnabled()).to.be(true);
    expect(update.called).to.be(true);
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
    expect(result.min && result.min.valueOf()).to.eql(clockNowTicks - fifteenMinutesInMilliseconds);
    expect(result.max && result.max.valueOf()).to.eql(clockNowTicks);
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
    expect(result.min && result.min.valueOf()).to.eql(forceNowTicks - fifteenMinutesInMilliseconds);
    expect(result.max && result.max.valueOf()).to.eql(forceNowTicks);
  });

  test(`throws Error if forceNow can't be parsed`, () => {
    const timeRange = {
      from: 'now-15m',
      to: 'now',
    };

    stubNowTime('not_a_parsable_date');
    expect(() => timefilter.calculateBounds(timeRange)).to.throwError();
  });
});
