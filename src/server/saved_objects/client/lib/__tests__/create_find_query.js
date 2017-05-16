import expect from 'expect.js';
import { createFindQuery } from '../create_find_query';

describe('createFindQuery', () => {
  it('matches all when there is no type or filter', () => {
    const query = createFindQuery();
    expect(query).to.eql({ query: { match_all: {} }, version: true });
  });

  it('adds bool filter for type', () => {
    const query = createFindQuery({ type: 'index-pattern' });
    expect(query).to.eql({
      query: {
        bool: {
          filter: [{
            term: {
              _type: 'index-pattern'
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
    const query = createFindQuery({ search: 'foo' });
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

  it('can search a single field', () => {
    const query = createFindQuery({ search: 'foo', searchFields: 'title' });
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

  it('can search across multiple fields', () => {
    const query = createFindQuery({ search: 'foo', searchFields: ['title', 'description'] });
    expect(query).to.eql({
      query: {
        bool: {
          filter: [],
          must: [{
            simple_query_string: {
              query: 'foo',
              fields: ['title', 'description']
            }
          }]
        }
      },
      version: true
    });
  });
});
