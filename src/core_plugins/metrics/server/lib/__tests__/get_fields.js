import { expect } from 'chai';
import { getParams, handleResponse } from '../get_fields';

describe('getFields', () => {

  describe('getParams', () => {

    it('returns a valid params object', () => {
      const req = { query: { index: 'metricbeat-*' } };
      expect(getParams(req)).to.eql({
        index: 'metricbeat-*',
        fields: ['*'],
        ignoreUnavailable: false,
        allowNoIndices: false,
        includeDefaults: true
      });
    });

  });

  describe('handleResponse', () => {
    it('returns a valid response', () => {
      const resp = {
        fields: {
          '@timestamp': {
            'date': {
              'type': 'date',
              'searchable': true,
              'aggregatable': true
            }
          },
          'id.keyword': {
            'keyword': {
              'type': 'keyword',
              'searchable': true,
              'aggregatable': true
            }
          },
          'message': {
            'text': {
              'type': 'text',
              'searchable': true,
              'aggregatable': false
            }
          },
          'beat.hostname': {
            'keyword': {
              'type': 'keyword',
              'searchable': true,
              'aggregatable': true
            }
          }
        }
      };
      expect(handleResponse(resp)).to.eql([
        { name: '@timestamp', type: 'date', aggregatable: true },
        { name: 'id.keyword', type: 'keyword', aggregatable: true },
        { name: 'beat.hostname', type: 'keyword', aggregatable: true }
      ]);
    });
  });

});
