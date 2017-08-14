import expect from 'expect.js';
import { createFindQuery } from '../create_find_query';

const mappings = {};

describe('createFindQuery', () => {
  it('matches all when there is no type or filter', () => {
    const query = createFindQuery(mappings);
    expect(query).to.eql({ query: { match_all: {} }, version: true });
  });

  it('adds bool filter for type', () => {
    const query = createFindQuery(mappings, { type: 'index-pattern' });
    expect(query).to.eql({
      query: {
        bool: {
          filter: [{
            bool: {
              should: [
                {
                  term: {
                    _type: 'index-pattern'
                  }
                },
                {
                  term: {
                    type: 'index-pattern'
                  }
                }
              ]
            }
          }],
          must: [{
            match_all: {}
          }]
        }
      },
      version: true
    });
  });

  it('can search across all fields', () => {
    const query = createFindQuery(mappings, { search: 'foo' });
    expect(query).to.eql({
      query: {
        bool: {
          filter: [],
          must: [{
            simple_query_string: {
              query: 'foo',
              all_fields: true
            }
          }]
        }
      },
      version: true
    });
  });

  it('can search a single field with no type', () => {
    const query = createFindQuery(mappings, { search: 'foo', searchFields: 'title' });
    expect(query).to.eql({
      query: {
        bool: {
          filter: [],
          must: [{
            simple_query_string: {
              query: 'foo',
              fields: ['title']
            }
          }]
        }
      },
      version: true
    });
  });

  it('can search a single field with a given type', () => {
    const query = createFindQuery(mappings, { search: 'foo', searchFields: 'title', type: 'bar' });
    expect(query).to.eql({
      query: {
        bool: {
          filter: [{
            bool: {
              should: [
                {
                  term: {
                    _type: 'bar'
                  }
                },
                {
                  term: {
                    type: 'bar'
                  }
                }
              ]
            }
          }],
          must: [{
            simple_query_string: {
              query: 'foo',
              fields: ['title', 'bar.title']
            }
          }]
        }
      },
      version: true
    });
  });

  it('can search across multiple fields', () => {
    const query = createFindQuery(mappings, { search: 'foo', searchFields: ['title', 'description'], type: 'bar'  });
    expect(query).to.eql({
      query: {
        bool: {
          filter: [{
            bool: {
              should: [
                {
                  term: {
                    _type: 'bar'
                  }
                },
                {
                  term: {
                    type: 'bar'
                  }
                }
              ]
            }
          }],
          must: [{
            simple_query_string: {
              query: 'foo',
              fields: ['title', 'description', 'bar.title', 'bar.description']
            }
          }]
        }
      },
      version: true
    });
  });
});
