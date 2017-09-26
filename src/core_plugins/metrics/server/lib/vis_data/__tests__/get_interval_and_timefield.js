import { expect } from 'chai';
import getIntervalAndTimefield from '../get_interval_and_timefield';

describe('getIntervalAndTimefield(panel, series)', () => {

  it('returns the panel interval, minInterval and timefield', () => {
    const panel = { time_field: '@timestamp', interval: 'auto', min_interval: '1ms' };
    const series = {};
    expect(getIntervalAndTimefield(panel, series)).to.eql({
      timeField: '@timestamp',
      interval: 'auto',
      minInterval: '1ms'
    });
  });

  it('returns the series interval, minInterval and timefield', () => {
    const panel = { time_field: '@timestamp', interval: 'auto' };
    const series = { override_index_pattern: true, series_interval: '1m', series_time_field: 'time', series_min_interval: '1ms' };
    expect(getIntervalAndTimefield(panel, series)).to.eql({
      timeField: 'time',
      interval: '1m',
      minInterval: '1ms'
    });
  });

});
