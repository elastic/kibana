import { expect } from 'chai';
import { getParams, handleResponse, handleError } from '../calculate_indices';

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
              max_value: { gte: 1483228800000, format: 'epoch_millis' },
              min_value: { lte: 1483487999000, format: 'epoch_millis' }
            }
          }
        }
      });
    });

  });

  describe('handleError', () => {
    it('should resolve a promise with an array with the index pattern', () => {
      const error = new Error('_field_stats');
      error.statusCode = 400;
      return handleError('metricbeat-*')(error)
        .then(resp => expect(resp).to.eql(['metricbeat-*']));
    });

    it('should reject a promise if the error is not field stats', () => {
      const error = new Error('_');
      error.statusCode = 404;
      return handleError('metricbeat-*')(error)
        .catch(err => expect(err instanceof Error).to.equal(true));
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
      expect(handleResponse('metricbeat-*')(resp)).to.eql([
        'metricbeat-2017.01.01',
        'metricbeat-2017.01.02',
        'metricbeat-2017.01.03',
      ]);
    });

    it('returns an array with the index pattern if none found', () => {
      const resp = { indices: { } };
      expect(handleResponse('metricbeat-*')(resp)).to.eql(['metricbeat-*']);
    });
  });
});
