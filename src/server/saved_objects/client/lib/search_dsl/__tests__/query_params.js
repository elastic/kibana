import expect from 'expect.js';

import { getQueryParams } from '../query_params';

const MAPPINGS = {
  rootType: {
    properties: {
      type: {
        type: 'keyword'
      },
      pending: {
        properties: {
          title: {
            type: 'text',
          }
        }
      },
      saved: {
        properties: {
          title: {
            type: 'text',
            fields: {
              raw: {
                type: 'keyword'
              }
            }
          },
          obj: {
            properties: {
              key1: {
                type: 'text'
              }
            }
          }
        }
      }
    }
  }
};

describe('searchDsl/queryParams', () => {
  describe('{}', () => {
    it('searches for everything', () => {
      expect(getQueryParams(MAPPINGS))
        .to.eql({});
    });
  });

  describe('{type}', () => {
    it('includes just a terms filter', () => {
      expect(getQueryParams(MAPPINGS, 'saved'))
        .to.eql({
          query: {
            bool: {
              filter: [
                {
                  term: { type: 'saved' }
                }
              ]
            }
          }
        });
    });
  });

  describe('{tags}', () => {
    it('includes just a tags filter', () => {
      const type = null;
      const search = null;
      const searchFields = null;
      const body = getQueryParams(MAPPINGS, type, search, searchFields, ['tagId1', 'tagId2']);

      expect(body)
        .to.eql({
          query: {
            bool: {
              filter: [
                {
                  'bool': {
                    'should': [
                      { 'term': { 'tags': 'tagId1' } },
                      { 'term': { 'tags': 'tagId2' } }
                    ]
                  }
                }
              ]
            }
          }
        });
    });
  });

  describe('{search}', () => {
    it('includes just a sqs query', () => {
      expect(getQueryParams(MAPPINGS, null, 'us*'))
        .to.eql({
          query: {
            bool: {
              must: [
                {
                  simple_query_string: {
                    query: 'us*',
                    all_fields: true
                  }
                }
              ]
            }
          }
        });
    });
  });

  describe('{type,search}', () => {
    it('includes bool with sqs query and term filter for type', () => {
      expect(getQueryParams(MAPPINGS, 'saved', 'y*'))
        .to.eql({
          query: {
            bool: {
              filter: [
                { term: { type: 'saved' } }
              ],
              must: [
                {
                  simple_query_string: {
                    query: 'y*',
                    all_fields: true
                  }
                }
              ]
            }
          }
        });
    });
  });

  describe('{search,searchFields}', () => {
    it('includes all types for field', () => {
      expect(getQueryParams(MAPPINGS, null, 'y*', ['title']))
        .to.eql({
          query: {
            bool: {
              must: [
                {
                  simple_query_string: {
                    query: 'y*',
                    fields: [
                      'type.title',
                      'pending.title',
                      'saved.title'
                    ]
                  }
                }
              ]
            }
          }
        });
    });
    it('supports field boosting', () => {
      expect(getQueryParams(MAPPINGS, null, 'y*', ['title^3']))
        .to.eql({
          query: {
            bool: {
              must: [
                {
                  simple_query_string: {
                    query: 'y*',
                    fields: [
                      'type.title^3',
                      'pending.title^3',
                      'saved.title^3'
                    ]
                  }
                }
              ]
            }
          }
        });
    });
    it('supports field and multi-field', () => {
      expect(getQueryParams(MAPPINGS, null, 'y*', ['title', 'title.raw']))
        .to.eql({
          query: {
            bool: {
              must: [
                {
                  simple_query_string: {
                    query: 'y*',
                    fields: [
                      'type.title',
                      'pending.title',
                      'saved.title',
                      'type.title.raw',
                      'pending.title.raw',
                      'saved.title.raw',
                    ]
                  }
                }
              ]
            }
          }
        });
    });
  });

  describe('{type,search,searchFields, tags}', () => {
    it('includes bool, and sqs with field list', () => {
      expect(getQueryParams(MAPPINGS, 'saved', 'y*', ['title'], ['tagId1', 'tagId2']))
        .to.eql({
          query: {
            bool: {
              filter: [
                { term: { type: 'saved' } },
                {
                  'bool': {
                    'should': [
                      { 'term': { 'tags': 'tagId1' } },
                      { 'term': { 'tags': 'tagId2' } }
                    ]
                  }
                }
              ],
              must: [
                {
                  simple_query_string: {
                    query: 'y*',
                    fields: [
                      'saved.title'
                    ]
                  }
                }
              ]
            }
          }
        });
    });
    it('supports fields pointing to multi-fields', () => {
      expect(getQueryParams(MAPPINGS, 'saved', 'y*', ['title.raw']))
        .to.eql({
          query: {
            bool: {
              filter: [
                { term: { type: 'saved' } }
              ],
              must: [
                {
                  simple_query_string: {
                    query: 'y*',
                    fields: [
                      'saved.title.raw'
                    ]
                  }
                }
              ]
            }
          }
        });
    });
    it('supports multiple search fields', () => {
      expect(getQueryParams(MAPPINGS, 'saved', 'y*', ['title', 'title.raw']))
        .to.eql({
          query: {
            bool: {
              filter: [
                { term: { type: 'saved' } }
              ],
              must: [
                {
                  simple_query_string: {
                    query: 'y*',
                    fields: [
                      'saved.title',
                      'saved.title.raw'
                    ]
                  }
                }
              ]
            }
          }
        });
    });
  });
});
