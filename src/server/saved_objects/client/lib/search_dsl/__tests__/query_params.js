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
    it('supports fields pointing to multi-fields', () => {
      expect(getQueryParams(MAPPINGS, null, 'y*', ['title']))
        .to.eql({
          query: {
            bool: {
              must: [
                {
                  simple_query_string: {
                    query: 'y*',
                    fields: [
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
    it('excludes field paths which do not exist', () => {
      expect(getQueryParams(MAPPINGS, null, 'y*', ['title.raw']))
        .to.eql({
          query: {
            bool: {
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
      expect(getQueryParams(MAPPINGS, null, 'y*', ['title', 'title.raw']))
        .to.eql({
          query: {
            bool: {
              must: [
                {
                  simple_query_string: {
                    query: 'y*',
                    fields: [
                      'pending.title',
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

  describe('{type,search,searchFields}', () => {
    it('includes bool, and sqs with field list', () => {
      expect(getQueryParams(MAPPINGS, 'saved', 'y*', ['title']))
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
