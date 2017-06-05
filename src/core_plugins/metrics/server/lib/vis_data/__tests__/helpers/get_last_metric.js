import { expect } from 'chai';
import getLastMetric from '../../helpers/get_last_metric';

describe('getLastMetric(series)', () => {
  it('returns the last metric', () => {
    const series = {
      metrics: [
        { id: 1, type: 'avg' },
        { id: 2, type: 'moving_average' }
      ]
    };
    expect(getLastMetric(series)).to.eql({ id: 2, type: 'moving_average' });
  });
  it('returns the last metric that not a series_agg', () => {
    const series = {
      metrics: [
        { id: 1, type: 'avg' },
        { id: 2, type: 'series_agg' }
      ]
    };
    expect(getLastMetric(series)).to.eql({ id: 1, type: 'avg' });
  });
});
