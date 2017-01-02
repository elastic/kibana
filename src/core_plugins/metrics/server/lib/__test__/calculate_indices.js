import { expect } from 'chai';
import { getParams, handleResponse } from '../calculate_indices';

describe('calculateIndices', () => {

  describe('getParams', () => {
    const req = {
      payload: {
        timerange: {
          min: '2017-01-01T00:00:00.000Z',
          max: '2017-01-03T23:59:59.000Z'
        },
      }
    };

    it('should return a valid param object', () => {
      expect(getParams(req, 'metricbeat-*', '@timestamp')).to.eql({
        index: 'metricbeat-*',
        level: 'indices',
        ignoreUnavailable: true,
        body: {
          fields: ['@timestamp'],
          index_constraints: {
            '@timestamp': {
              max_value: { gte: '2017-01-03T23:59:59.000Z' },
              min_value: { lte: '2017-01-01T00:00:00.000Z' }
            }
          }
        }
      });
    });

  });

  describe('handleResponse', () => {
    it('returns an array of indices', () => {
      const resp = {
        indices: {
          'metricbeat-2017.01.01': {},
          'metricbeat-2017.01.02': {},
          'metricbeat-2017.01.03': {}
        }
      };
      expect(handleResponse(resp)).to.eql([
        'metricbeat-2017.01.01',
        'metricbeat-2017.01.02',
        'metricbeat-2017.01.03',
      ]);
    });

    it('returns an empty array if none found', () => {
      const resp = { indices: { } };
      expect(handleResponse(resp)).to.be.empty;
    });
  });
});
