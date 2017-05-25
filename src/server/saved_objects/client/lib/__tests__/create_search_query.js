import expect from 'expect.js';
import { createSearchQuery } from '../create_search_query';

describe('createSearchQuery', () => {
  it('matches all when there is no type or filter', () => {
    const query = createSearchQuery();
    expect(query).to.eql({
      bool: {
        filter: [],
        must: [{
          match_all: {}
        }]
      }
    });
  });

  it('adds bool filter for type', () => {
    const query = createSearchQuery({ type: 'index-pattern' });
    expect(query).to.eql({
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
    });
  });

  it('can search across all fields', () => {
    const query = createSearchQuery({ search: 'foo' });
    expect(query).to.eql({
      bool: {
        filter: [],
        must: [{
          match_all: {},
        },{
          simple_query_string: {
            query: 'foo',
            all_fields: true
          }
        }]
      }
    });
  });

  it('can search for specific ids', () => {
    const ids = ['a', 'b'];
    const query = createSearchQuery({ ids: ids, type: 'search' });
    expect(query).to.eql({
      ids: {
        type: 'search',
        values: ids
      }
    });
  });

  it('can search a single field', () => {
    const query = createSearchQuery({ search: 'foo', searchFields: 'title' });
    expect(query).to.eql({
      bool: {
        filter: [],
        must: [{
          match_all: {},
        },{
          simple_query_string: {
            query: 'foo',
            fields: 'title'
          }
        }]
      }
    });
  });

  it('can search across multiple fields', () => {
    const query = createSearchQuery({ search: 'foo', searchFields: ['title', 'description'] });
    expect(query).to.eql({
      bool: {
        filter: [],
        must: [{
          match_all: {},
        },{
          simple_query_string: {
            query: 'foo',
            fields: ['title', 'description']
          }
        }]
      }
    });
  });
});
