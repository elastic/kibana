import { expect } from 'chai';
import getSplits from '../../helpers/get_splits';

describe('getSplits(resp, panel, series)', () => {

  it('should return a splits for everything/filter group bys', () => {
    const resp = {
      aggregations: {
        SERIES: {
          timeseries: { buckets: [] },
          SIBAGG: { value: 1 }
        }
      }
    };
    const panel = { type: 'timeseries' };
    const series = {
      id: 'SERIES',
      color: '#F00',
      split_mode: 'everything',
      metrics: [
        { id: 'AVG', type: 'avg', field: 'cpu' },
        { id: 'SIBAGG', type: 'avg_bucket', field: 'AVG' }
      ]
    };
    expect(getSplits(resp, panel, series)).to.eql([
      {
        id: 'SERIES',
        label: 'Overall Average of Average of cpu',
        color: '#FF0000',
        timeseries: { buckets: [] },
        SIBAGG: { value: 1 }
      }
    ]);
  });

  it('should return a splits for terms group bys for top_n', () => {
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
    const panel = { type: 'top_n' };
    expect(getSplits(resp, panel, series)).to.eql([
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
        color: '#FF0000',
        timeseries: { buckets: [] },
        SIBAGG: { value: 2 }
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
    const panel = { type: 'timeseries' };
    expect(getSplits(resp, panel, series)).to.eql([
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
        color: '#930000',
        timeseries: { buckets: [] },
        SIBAGG: { value: 2 }
      }
    ]);
  });

  it('should return a splits for filters group bys', () => {
    const resp = {
      aggregations: {
        SERIES: {
          buckets: {
            'filter-1': {
              timeseries: { buckets: [] },
            },
            'filter-2': {
              timeseries: { buckets: [] },
            }
          }
        }
      }
    };
    const series = {
      id: 'SERIES',
      color: '#F00',
      split_mode: 'filters',
      split_filters: [
        { id: 'filter-1', color: '#F00', filter: 'status_code:[* TO 200]', label: '200s' },
        { id: 'filter-2', color: '#0F0', filter: 'status_code:[300 TO *]', label: '300s' }
      ],
      metrics: [
        { id: 'COUNT', type: 'count' },
      ]
    };
    const panel = { type: 'timeseries' };
    expect(getSplits(resp, panel, series)).to.eql([
      {
        id: 'SERIES:filter-1',
        key: 'filter-1',
        label: '200s',
        color: '#F00',
        timeseries: { buckets: [] },
      },
      {
        id: 'SERIES:filter-2',
        key: 'filter-2',
        label: '300s',
        color: '#0F0',
        timeseries: { buckets: [] },
      }
    ]);
  });

});
