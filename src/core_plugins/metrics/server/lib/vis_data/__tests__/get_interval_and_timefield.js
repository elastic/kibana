import { expect } from 'chai';
import getIntervalAndTimefield from '../get_interval_and_timefield';

describe('getIntervalAndTimefield(panel, series)', () => {

  it('returns the panel interval and timefield', () => {
    const panel = { time_field: '@timestamp', interval: 'auto' };
    const series = {};
    expect(getIntervalAndTimefield(panel, series)).to.eql({
      timeField: '@timestamp',
      interval: 'auto'
    });
  });

  it('returns the series interval and timefield', () => {
    const panel = { time_field: '@timestamp', interval: 'auto' };
    const series = { override_index_pattern: true, series_interval: '1m', series_time_field: 'time' };
    expect(getIntervalAndTimefield(panel, series)).to.eql({
      timeField: 'time',
      interval: '1m'
    });
  });

});
