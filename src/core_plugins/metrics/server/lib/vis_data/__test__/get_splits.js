import { expect } from 'chai';
import getSplits from '../get_splits';

describe('getSplits(resp, series)', () => {

  it('should return a splits for everything/filter group bys', () => {
    const resp = {
      aggregations: {
        SERIES: {
          timeseries: { buckets: [] },
          SIBAGG: { value: 1 }
        }
      }
    };
    const series = {
      id: 'SERIES',
      color: '#F00',
      split_mode: 'everything',
      metrics: [
        { id: 'AVG', type: 'avg', field: 'cpu' },
        { id: 'SIBAGG', type: 'avg_bucket', field: 'AVG' }
      ]
    };
    expect(getSplits(resp, series)).to.eql([
      {
        id: 'SERIES',
        label: 'Overall Average of Average of cpu',
        color: '#FF0000',
        timeseries: { buckets: [] },
        SIBAGG: { value: 1 }
      }
    ]);
  });

  it('should return a splits for terms group bys', () => {
    const resp = {
      aggregations: {
        SERIES: {
          buckets: [
            {
              key: 'example-01',
              timeseries: { buckets: [] },
              SIBAGG: { value: 1 }
            },
            {
              key: 'example-02',
              timeseries: { buckets: [] },
              SIBAGG: { value: 2 }
            }
          ]
        }
      }
    };
    const series = {
      id: 'SERIES',
      color: '#F00',
      split_mode: 'terms',
      terms_field: 'beat.hostname',
      terms_size: 10,
      metrics: [
        { id: 'AVG', type: 'avg', field: 'cpu' },
        { id: 'SIBAGG', type: 'avg_bucket', field: 'AVG' }
      ]
    };
    expect(getSplits(resp, series)).to.eql([
      {
        id: 'SERIES:example-01',
        key: 'example-01',
        label: 'example-01',
        color: '#FF0000',
        timeseries: { buckets: [] },
        SIBAGG: { value: 1 }
      },
      {
        id: 'SERIES:example-02',
        key: 'example-02',
        label: 'example-02',
        color: '#E60000',
        timeseries: { buckets: [] },
        SIBAGG: { value: 2 }
      }
    ]);
  });

});
