import expect from 'expect.js';
import { getSearchDsl } from '../search_dsl';
import { MappingsCollection } from '../../../../../mappings';

function createMappings(types = []) {
  const props = types
    .reduce((acc, type) => ({
      ...acc,
      [type]: {
        properties: {
          name: {
            type: 'keyword'
          },
          order: {
            type: 'integer'
          }
        }
      }
    }), {});

  return (new MappingsCollection('foo', props)).getCombined();
}

function test({ mappings, params, expected }) {
  expect(getSearchDsl(mappings, params)).to.eql(expected);
}

describe('getSearchDsl', () => {
  describe('{}', () => {
    it('matches all', () => {
      test({
        mappings: createMappings(['foo']),
        params: {},
        expected: {}
      });
    });
  });

  describe('{type}', () => {
    it('includes type filter', () => {
      test({
        mappings: createMappings(['foo', 'bar']),
        params: {
          type: 'bar'
        },
        expected: {
          query: {
            bool: {
              filter: [
                { term: { type: 'bar' } }
              ]
            }
          }
        }
      });
    });
  });

  describe('{search}', () => {
    it('includes a search across all fields on all types', () => {
      test({
        mappings: createMappings(['foo', 'bar']),
        params: {
          search: 'foo'
        },
        expected: {
          query: {
            bool: {
              must: [{
                simple_query_string: {
                  query: 'foo',
                  all_fields: true,
                }
              }]
            }
          },
        }
      });
    });
  });

  describe('{sortOrder}', () => {
    it('only accepts sort order when sorting on a field', () => {
      expect(() => {
        test({
          mappings: createMappings(['a']),
          params: {
            sortOrder: 'asc',
          }
        });
      }).to.throwError(error => {
        expect(error).to.have.property('message').contain('requires a sortField');
      });
    });
  });

  describe('{sortField}', () => {
    it('requires a type', () => {
      expect(() => {
        test({
          mappings: createMappings(['foo', 'bar']),
          params: {
            sortOrder: 'asc',
            sortField: 'name'
          }
        });
      }).to.throwError(error => {
        expect(error).to.have.property('message').contain('without filtering by type');
      });
    });
  });

  describe('{type,search}', () => {
    it('includes search for all fields', () => {
      test({
        mappings: createMappings(['foo', 'bar']),
        params: {
          type: 'foo',
          search: 'f*'
        },
        expected: {
          query: {
            bool: {
              filter: [
                { term: { type: 'foo' } }
              ],
              must: [
                {
                  simple_query_string: {
                    query: 'f*',
                    all_fields: true
                  }
                }
              ]
            }
          }
        }
      });
    });
  });

  describe('{search,searchFields}', () => {
    it('includes a search on a single field, on all types', () => {
      test({
        mappings: createMappings(['foo', 'bar']),
        params: {
          search: 'foo',
          searchFields: ['title']
        },
        expected: {
          query: {
            bool: {
              must: [{
                simple_query_string: {
                  query: 'foo',
                  fields: [
                    'foo.title',
                    'bar.title',
                  ]
                }
              }]
            }
          },
        }
      });
    });
  });

  describe('{search,searchFieldsx2}', () => {
    it('includes a search on a single field, on all types', () => {
      test({
        mappings: createMappings(['foo', 'bar']),
        params: {
          search: 'foo',
          searchFields: ['title', 'name']
        },
        expected: {
          query: {
            bool: {
              must: [{
                simple_query_string: {
                  query: 'foo',
                  fields: [
                    'foo.title',
                    'bar.title',
                    'foo.name',
                    'bar.name',
                  ]
                }
              }]
            }
          },
        }
      });
    });
  });

  describe('{search,type}', () => {
    it('includes search for all fields', () => {
      test({
        mappings: createMappings(['foo', 'bar']),
        params: {
          type: 'foo',
          search: 'f*'
        },
        expected: {
          query: {
            bool: {
              filter: [
                { term: { type: 'foo' } }
              ],
              must: [
                {
                  simple_query_string: {
                    query: 'f*',
                    all_fields: true
                  }
                }
              ]
            }
          }
        }
      });
    });
  });

  describe('{search,searchFields,type}', () => {
    it('includes search for specific fields', () => {
      test({
        mappings: createMappings(['foo', 'bar']),
        params: {
          type: 'bar',
          search: 'f*',
          searchFields: ['name^2', 'body']
        },
        expected: {
          query: {
            bool: {
              filter: [
                { term: { type: 'bar' } }
              ],
              must: [
                {
                  simple_query_string: {
                    query: 'f*',
                    fields: [
                      'bar.name^2',
                      'bar.body'
                    ]
                  }
                }
              ]
            }
          }
        }
      });
    });
  });

  describe('{search,type,sortField,sortOrder}', () => {
    it('includes sort with search on all fields', () => {
      test({
        mappings: createMappings(['baz', 'bar']),
        params: {
          type: 'baz',
          search: 'f*',
          sortField: 'name',
          sortOrder: 'desc',
        },
        expected: {
          sort: [
            {
              'baz.name': {
                order: 'desc',
                unmapped_type: 'keyword'
              }
            }
          ],
          query: {
            bool: {
              filter: [
                { term: { type: 'baz' } }
              ],
              must: [
                {
                  simple_query_string: {
                    query: 'f*',
                    all_fields: true,
                  }
                }
              ]
            }
          }
        }
      });
    });
  });
});
