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
        'foo': {
          'mappings': {
            'bar': {
              '@timestamp': {
                'full_name': '@timestamp',
                'mapping': {
                  '@timestamp': {
                    'type': 'date'
                  }
                }
              }
            }
          }
        },
        'twitter': {
          'mappings': {
            'tweet': {
              'message': {
                'full_name': 'message',
                'mapping': {
                  'message': {
                    'type': 'text',
                    'fields': {
                      'keyword': {
                        'type': 'keyword',
                        'ignore_above': 256
                      }
                    }
                  }
                }
              },
              '@timestamp': {
                'full_name': '@timestamp',
                'mapping': {
                  '@timestamp': {
                    'type': 'date'
                  }
                }
              },
              'id.keyword': {
                'full_name': 'id.keyword',
                'mapping': {
                  'keyword': {
                    'type': 'keyword',
                    'ignore_above': 256
                  }
                }
              }
            }
          }
        }
      };
      expect(handleResponse(resp)).to.eql([
        { name: '@timestamp', type: 'date' },
        { name: 'id.keyword', type: 'keyword' },
        { name: 'message', type: 'text' }
      ]);
    });
  });

});
