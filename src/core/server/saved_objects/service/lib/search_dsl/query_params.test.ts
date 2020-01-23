/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { schemaMock } from '../../../schema/schema.mock';
import { getQueryParams } from './query_params';

const SCHEMA = schemaMock.create();
const MAPPINGS = {
  properties: {
    type: {
      type: 'keyword',
    },
    pending: {
      properties: {
        title: {
          type: 'text',
        },
      },
    },
    saved: {
      properties: {
        title: {
          type: 'text',
          fields: {
            raw: {
              type: 'keyword',
            },
          },
        },
        obj: {
          properties: {
            key1: {
              type: 'text',
            },
          },
        },
      },
    },
    global: {
      properties: {
        name: {
          type: 'keyword',
        },
      },
    },
  },
};

// create a type clause to be used within the "should", if a namespace is specified
// the clause will ensure the namespace matches; otherwise, the clause will ensure
// that there isn't a namespace field.
const createTypeClause = (type: string, namespace?: string) => {
  if (namespace) {
    return {
      bool: {
        must: [{ term: { type } }, { term: { namespace } }],
      },
    };
  }

  return {
    bool: {
      must: [{ term: { type } }],
      must_not: [{ exists: { field: 'namespace' } }],
    },
  };
};

describe('searchDsl/queryParams', () => {
  describe('no parameters', () => {
    it('searches for all known types without a namespace specified', () => {
      expect(getQueryParams({ mappings: MAPPINGS, schema: SCHEMA })).toEqual({
        query: {
          bool: {
            filter: [
              {
                bool: {
                  should: [
                    createTypeClause('pending'),
                    createTypeClause('saved'),
                    createTypeClause('global'),
                  ],
                  minimum_should_match: 1,
                },
              },
            ],
          },
        },
      });
    });
  });

  describe('namespace', () => {
    it('filters namespaced types for namespace, and ensures namespace agnostic types have no namespace', () => {
      expect(
        getQueryParams({ mappings: MAPPINGS, schema: SCHEMA, namespace: 'foo-namespace' })
      ).toEqual({
        query: {
          bool: {
            filter: [
              {
                bool: {
                  should: [
                    createTypeClause('pending', 'foo-namespace'),
                    createTypeClause('saved', 'foo-namespace'),
                    createTypeClause('global'),
                  ],
                  minimum_should_match: 1,
                },
              },
            ],
          },
        },
      });
    });
  });

  describe('type (singular, namespaced)', () => {
    it('includes a terms filter for type and namespace not being specified', () => {
      expect(
        getQueryParams({ mappings: MAPPINGS, schema: SCHEMA, namespace: undefined, type: 'saved' })
      ).toEqual({
        query: {
          bool: {
            filter: [
              {
                bool: {
                  should: [createTypeClause('saved')],
                  minimum_should_match: 1,
                },
              },
            ],
          },
        },
      });
    });
  });

  describe('type (singular, global)', () => {
    it('includes a terms filter for type and namespace not being specified', () => {
      expect(
        getQueryParams({ mappings: MAPPINGS, schema: SCHEMA, namespace: undefined, type: 'global' })
      ).toEqual({
        query: {
          bool: {
            filter: [
              {
                bool: {
                  should: [createTypeClause('global')],
                  minimum_should_match: 1,
                },
              },
            ],
          },
        },
      });
    });
  });

  describe('type (plural, namespaced and global)', () => {
    it('includes term filters for types and namespace not being specified', () => {
      expect(
        getQueryParams({
          mappings: MAPPINGS,
          schema: SCHEMA,
          namespace: undefined,
          type: ['saved', 'global'],
        })
      ).toEqual({
        query: {
          bool: {
            filter: [
              {
                bool: {
                  should: [createTypeClause('saved'), createTypeClause('global')],
                  minimum_should_match: 1,
                },
              },
            ],
          },
        },
      });
    });
  });

  describe('namespace, type (plural, namespaced and global)', () => {
    it('includes a terms filter for type and namespace not being specified', () => {
      expect(
        getQueryParams({
          mappings: MAPPINGS,
          schema: SCHEMA,
          namespace: 'foo-namespace',
          type: ['saved', 'global'],
        })
      ).toEqual({
        query: {
          bool: {
            filter: [
              {
                bool: {
                  should: [createTypeClause('saved', 'foo-namespace'), createTypeClause('global')],
                  minimum_should_match: 1,
                },
              },
            ],
          },
        },
      });
    });
  });

  describe('search', () => {
    it('includes a sqs query and all known types without a namespace specified', () => {
      expect(
        getQueryParams({
          mappings: MAPPINGS,
          schema: SCHEMA,
          namespace: undefined,
          type: undefined,
          search: 'us*',
        })
      ).toEqual({
        query: {
          bool: {
            filter: [
              {
                bool: {
                  should: [
                    createTypeClause('pending'),
                    createTypeClause('saved'),
                    createTypeClause('global'),
                  ],
                  minimum_should_match: 1,
                },
              },
            ],
            must: [
              {
                simple_query_string: {
                  query: 'us*',
                  lenient: true,
                  fields: ['*'],
                },
              },
            ],
          },
        },
      });
    });
  });

  describe('namespace, search', () => {
    it('includes a sqs query and namespaced types with the namespace and global types without a namespace', () => {
      expect(
        getQueryParams({
          mappings: MAPPINGS,
          schema: SCHEMA,
          namespace: 'foo-namespace',
          type: undefined,
          search: 'us*',
        })
      ).toEqual({
        query: {
          bool: {
            filter: [
              {
                bool: {
                  should: [
                    createTypeClause('pending', 'foo-namespace'),
                    createTypeClause('saved', 'foo-namespace'),
                    createTypeClause('global'),
                  ],
                  minimum_should_match: 1,
                },
              },
            ],
            must: [
              {
                simple_query_string: {
                  query: 'us*',
                  lenient: true,
                  fields: ['*'],
                },
              },
            ],
          },
        },
      });
    });
  });

  describe('type (plural, namespaced and global), search', () => {
    it('includes a sqs query and types without a namespace', () => {
      expect(
        getQueryParams({
          mappings: MAPPINGS,
          schema: SCHEMA,
          namespace: undefined,
          type: ['saved', 'global'],
          search: 'us*',
        })
      ).toEqual({
        query: {
          bool: {
            filter: [
              {
                bool: {
                  should: [createTypeClause('saved'), createTypeClause('global')],
                  minimum_should_match: 1,
                },
              },
            ],
            must: [
              {
                simple_query_string: {
                  query: 'us*',
                  lenient: true,
                  fields: ['*'],
                },
              },
            ],
          },
        },
      });
    });
  });

  describe('namespace, type (plural, namespaced and global), search', () => {
    it('includes a sqs query and namespace type with a namespace and global type without a namespace', () => {
      expect(
        getQueryParams({
          mappings: MAPPINGS,
          schema: SCHEMA,
          namespace: 'foo-namespace',
          type: ['saved', 'global'],
          search: 'us*',
        })
      ).toEqual({
        query: {
          bool: {
            filter: [
              {
                bool: {
                  should: [createTypeClause('saved', 'foo-namespace'), createTypeClause('global')],
                  minimum_should_match: 1,
                },
              },
            ],
            must: [
              {
                simple_query_string: {
                  query: 'us*',
                  lenient: true,
                  fields: ['*'],
                },
              },
            ],
          },
        },
      });
    });
  });

  describe('search, searchFields', () => {
    it('includes all types for field', () => {
      expect(
        getQueryParams({
          mappings: MAPPINGS,
          schema: SCHEMA,
          namespace: undefined,
          type: undefined,
          search: 'y*',
          searchFields: ['title'],
        })
      ).toEqual({
        query: {
          bool: {
            filter: [
              {
                bool: {
                  should: [
                    createTypeClause('pending'),
                    createTypeClause('saved'),
                    createTypeClause('global'),
                  ],
                  minimum_should_match: 1,
                },
              },
            ],
            must: [
              {
                simple_query_string: {
                  query: 'y*',
                  fields: ['pending.title', 'saved.title', 'global.title'],
                },
              },
            ],
          },
        },
      });
    });
    it('supports field boosting', () => {
      expect(
        getQueryParams({
          mappings: MAPPINGS,
          schema: SCHEMA,
          namespace: undefined,
          type: undefined,
          search: 'y*',
          searchFields: ['title^3'],
        })
      ).toEqual({
        query: {
          bool: {
            filter: [
              {
                bool: {
                  should: [
                    createTypeClause('pending'),
                    createTypeClause('saved'),
                    createTypeClause('global'),
                  ],
                  minimum_should_match: 1,
                },
              },
            ],
            must: [
              {
                simple_query_string: {
                  query: 'y*',
                  fields: ['pending.title^3', 'saved.title^3', 'global.title^3'],
                },
              },
            ],
          },
        },
      });
    });
    it('supports field and multi-field', () => {
      expect(
        getQueryParams({
          mappings: MAPPINGS,
          schema: SCHEMA,
          namespace: undefined,
          type: undefined,
          search: 'y*',
          searchFields: ['title', 'title.raw'],
        })
      ).toEqual({
        query: {
          bool: {
            filter: [
              {
                bool: {
                  should: [
                    createTypeClause('pending'),
                    createTypeClause('saved'),
                    createTypeClause('global'),
                  ],
                  minimum_should_match: 1,
                },
              },
            ],
            must: [
              {
                simple_query_string: {
                  query: 'y*',
                  fields: [
                    'pending.title',
                    'saved.title',
                    'global.title',
                    'pending.title.raw',
                    'saved.title.raw',
                    'global.title.raw',
                  ],
                },
              },
            ],
          },
        },
      });
    });
  });

  describe('namespace, search, searchFields', () => {
    it('includes all types for field', () => {
      expect(
        getQueryParams({
          mappings: MAPPINGS,
          schema: SCHEMA,
          namespace: 'foo-namespace',
          type: undefined,
          search: 'y*',
          searchFields: ['title'],
        })
      ).toEqual({
        query: {
          bool: {
            filter: [
              {
                bool: {
                  should: [
                    createTypeClause('pending', 'foo-namespace'),
                    createTypeClause('saved', 'foo-namespace'),
                    createTypeClause('global'),
                  ],
                  minimum_should_match: 1,
                },
              },
            ],
            must: [
              {
                simple_query_string: {
                  query: 'y*',
                  fields: ['pending.title', 'saved.title', 'global.title'],
                },
              },
            ],
          },
        },
      });
    });
    it('supports field boosting', () => {
      expect(
        getQueryParams({
          mappings: MAPPINGS,
          schema: SCHEMA,
          namespace: 'foo-namespace',
          type: undefined,
          search: 'y*',
          searchFields: ['title^3'],
        })
      ).toEqual({
        query: {
          bool: {
            filter: [
              {
                bool: {
                  should: [
                    createTypeClause('pending', 'foo-namespace'),
                    createTypeClause('saved', 'foo-namespace'),
                    createTypeClause('global'),
                  ],
                  minimum_should_match: 1,
                },
              },
            ],
            must: [
              {
                simple_query_string: {
                  query: 'y*',
                  fields: ['pending.title^3', 'saved.title^3', 'global.title^3'],
                },
              },
            ],
          },
        },
      });
    });
    it('supports field and multi-field', () => {
      expect(
        getQueryParams({
          mappings: MAPPINGS,
          schema: SCHEMA,
          namespace: 'foo-namespace',
          type: undefined,
          search: 'y*',
          searchFields: ['title', 'title.raw'],
        })
      ).toEqual({
        query: {
          bool: {
            filter: [
              {
                bool: {
                  should: [
                    createTypeClause('pending', 'foo-namespace'),
                    createTypeClause('saved', 'foo-namespace'),
                    createTypeClause('global'),
                  ],
                  minimum_should_match: 1,
                },
              },
            ],
            must: [
              {
                simple_query_string: {
                  query: 'y*',
                  fields: [
                    'pending.title',
                    'saved.title',
                    'global.title',
                    'pending.title.raw',
                    'saved.title.raw',
                    'global.title.raw',
                  ],
                },
              },
            ],
          },
        },
      });
    });
  });

  describe('type (plural, namespaced and global), search, searchFields', () => {
    it('includes all types for field', () => {
      expect(
        getQueryParams({
          mappings: MAPPINGS,
          schema: SCHEMA,
          namespace: undefined,
          type: ['saved', 'global'],
          search: 'y*',
          searchFields: ['title'],
        })
      ).toEqual({
        query: {
          bool: {
            filter: [
              {
                bool: {
                  should: [createTypeClause('saved'), createTypeClause('global')],
                  minimum_should_match: 1,
                },
              },
            ],
            must: [
              {
                simple_query_string: {
                  query: 'y*',
                  fields: ['saved.title', 'global.title'],
                },
              },
            ],
          },
        },
      });
    });
    it('supports field boosting', () => {
      expect(
        getQueryParams({
          mappings: MAPPINGS,
          schema: SCHEMA,
          namespace: undefined,
          type: ['saved', 'global'],
          search: 'y*',
          searchFields: ['title^3'],
        })
      ).toEqual({
        query: {
          bool: {
            filter: [
              {
                bool: {
                  should: [createTypeClause('saved'), createTypeClause('global')],
                  minimum_should_match: 1,
                },
              },
            ],
            must: [
              {
                simple_query_string: {
                  query: 'y*',
                  fields: ['saved.title^3', 'global.title^3'],
                },
              },
            ],
          },
        },
      });
    });
    it('supports field and multi-field', () => {
      expect(
        getQueryParams({
          mappings: MAPPINGS,
          schema: SCHEMA,
          namespace: undefined,
          type: ['saved', 'global'],
          search: 'y*',
          searchFields: ['title', 'title.raw'],
        })
      ).toEqual({
        query: {
          bool: {
            filter: [
              {
                bool: {
                  should: [createTypeClause('saved'), createTypeClause('global')],
                  minimum_should_match: 1,
                },
              },
            ],
            must: [
              {
                simple_query_string: {
                  query: 'y*',
                  fields: ['saved.title', 'global.title', 'saved.title.raw', 'global.title.raw'],
                },
              },
            ],
          },
        },
      });
    });
  });

  describe('namespace, type (plural, namespaced and global), search, searchFields', () => {
    it('includes all types for field', () => {
      expect(
        getQueryParams({
          mappings: MAPPINGS,
          schema: SCHEMA,
          namespace: 'foo-namespace',
          type: ['saved', 'global'],
          search: 'y*',
          searchFields: ['title'],
        })
      ).toEqual({
        query: {
          bool: {
            filter: [
              {
                bool: {
                  should: [createTypeClause('saved', 'foo-namespace'), createTypeClause('global')],
                  minimum_should_match: 1,
                },
              },
            ],
            must: [
              {
                simple_query_string: {
                  query: 'y*',
                  fields: ['saved.title', 'global.title'],
                },
              },
            ],
          },
        },
      });
    });
    it('supports field boosting', () => {
      expect(
        getQueryParams({
          mappings: MAPPINGS,
          schema: SCHEMA,
          namespace: 'foo-namespace',
          type: ['saved', 'global'],
          search: 'y*',
          searchFields: ['title^3'],
        })
      ).toEqual({
        query: {
          bool: {
            filter: [
              {
                bool: {
                  should: [createTypeClause('saved', 'foo-namespace'), createTypeClause('global')],
                  minimum_should_match: 1,
                },
              },
            ],
            must: [
              {
                simple_query_string: {
                  query: 'y*',
                  fields: ['saved.title^3', 'global.title^3'],
                },
              },
            ],
          },
        },
      });
    });
    it('supports field and multi-field', () => {
      expect(
        getQueryParams({
          mappings: MAPPINGS,
          schema: SCHEMA,
          namespace: 'foo-namespace',
          type: ['saved', 'global'],
          search: 'y*',
          searchFields: ['title', 'title.raw'],
        })
      ).toEqual({
        query: {
          bool: {
            filter: [
              {
                bool: {
                  should: [createTypeClause('saved', 'foo-namespace'), createTypeClause('global')],
                  minimum_should_match: 1,
                },
              },
            ],
            must: [
              {
                simple_query_string: {
                  query: 'y*',
                  fields: ['saved.title', 'global.title', 'saved.title.raw', 'global.title.raw'],
                },
              },
            ],
          },
        },
      });
    });
  });

  describe('type (plural, namespaced and global), search, defaultSearchOperator', () => {
    it('supports defaultSearchOperator', () => {
      expect(
        getQueryParams({
          mappings: MAPPINGS,
          schema: SCHEMA,
          namespace: 'foo-namespace',
          type: ['saved', 'global'],
          search: 'foo',
          searchFields: undefined,
          defaultSearchOperator: 'AND',
        })
      ).toEqual({
        query: {
          bool: {
            filter: [
              {
                bool: {
                  minimum_should_match: 1,
                  should: [
                    {
                      bool: {
                        must: [
                          {
                            term: {
                              type: 'saved',
                            },
                          },
                          {
                            term: {
                              namespace: 'foo-namespace',
                            },
                          },
                        ],
                      },
                    },
                    {
                      bool: {
                        must: [
                          {
                            term: {
                              type: 'global',
                            },
                          },
                        ],
                        must_not: [
                          {
                            exists: {
                              field: 'namespace',
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            ],
            must: [
              {
                simple_query_string: {
                  lenient: true,
                  fields: ['*'],
                  default_operator: 'AND',
                  query: 'foo',
                },
              },
            ],
          },
        },
      });
    });
  });

  describe('type (plural, namespaced and global), hasReference', () => {
    it('supports hasReference', () => {
      expect(
        getQueryParams({
          mappings: MAPPINGS,
          schema: SCHEMA,
          namespace: 'foo-namespace',
          type: ['saved', 'global'],
          search: undefined,
          searchFields: undefined,
          defaultSearchOperator: 'OR',
          hasReference: {
            type: 'bar',
            id: '1',
          },
        })
      ).toEqual({
        query: {
          bool: {
            filter: [
              {
                bool: {
                  must: [
                    {
                      nested: {
                        path: 'references',
                        query: {
                          bool: {
                            must: [
                              {
                                term: {
                                  'references.id': '1',
                                },
                              },
                              {
                                term: {
                                  'references.type': 'bar',
                                },
                              },
                            ],
                          },
                        },
                      },
                    },
                  ],
                  should: [createTypeClause('saved', 'foo-namespace'), createTypeClause('global')],
                  minimum_should_match: 1,
                },
              },
            ],
          },
        },
      });
    });
  });

  describe('type filter', () => {
    it(' with namespace', () => {
      expect(
        getQueryParams({
          mappings: MAPPINGS,
          schema: SCHEMA,
          namespace: 'foo-namespace',
          kueryNode: {
            type: 'function',
            function: 'is',
            arguments: [
              { type: 'literal', value: 'global.name' },
              { type: 'literal', value: 'GLOBAL' },
              { type: 'literal', value: false },
            ],
          },
        })
      ).toEqual({
        query: {
          bool: {
            filter: [
              {
                bool: {
                  should: [
                    {
                      match: {
                        'global.name': 'GLOBAL',
                      },
                    },
                  ],
                  minimum_should_match: 1,
                },
              },
              {
                bool: {
                  should: [
                    {
                      bool: {
                        must: [
                          {
                            term: {
                              type: 'pending',
                            },
                          },
                          {
                            term: {
                              namespace: 'foo-namespace',
                            },
                          },
                        ],
                      },
                    },
                    {
                      bool: {
                        must: [
                          {
                            term: {
                              type: 'saved',
                            },
                          },
                          {
                            term: {
                              namespace: 'foo-namespace',
                            },
                          },
                        ],
                      },
                    },
                    {
                      bool: {
                        must: [
                          {
                            term: {
                              type: 'global',
                            },
                          },
                        ],
                        must_not: [
                          {
                            exists: {
                              field: 'namespace',
                            },
                          },
                        ],
                      },
                    },
                  ],
                  minimum_should_match: 1,
                },
              },
            ],
          },
        },
      });
    });
    it(' with namespace and more complex filter', () => {
      expect(
        getQueryParams({
          mappings: MAPPINGS,
          schema: SCHEMA,
          namespace: 'foo-namespace',
          kueryNode: {
            type: 'function',
            function: 'and',
            arguments: [
              {
                type: 'function',
                function: 'is',
                arguments: [
                  { type: 'literal', value: 'global.name' },
                  { type: 'literal', value: 'GLOBAL' },
                  { type: 'literal', value: false },
                ],
              },
              {
                type: 'function',
                function: 'not',
                arguments: [
                  {
                    type: 'function',
                    function: 'is',
                    arguments: [
                      { type: 'literal', value: 'saved.obj.key1' },
                      { type: 'literal', value: 'key' },
                      { type: 'literal', value: true },
                    ],
                  },
                ],
              },
            ],
          },
        })
      ).toEqual({
        query: {
          bool: {
            filter: [
              {
                bool: {
                  filter: [
                    {
                      bool: {
                        should: [
                          {
                            match: {
                              'global.name': 'GLOBAL',
                            },
                          },
                        ],
                        minimum_should_match: 1,
                      },
                    },
                    {
                      bool: {
                        must_not: {
                          bool: {
                            should: [
                              {
                                match_phrase: {
                                  'saved.obj.key1': 'key',
                                },
                              },
                            ],
                            minimum_should_match: 1,
                          },
                        },
                      },
                    },
                  ],
                },
              },
              {
                bool: {
                  should: [
                    {
                      bool: {
                        must: [
                          {
                            term: {
                              type: 'pending',
                            },
                          },
                          {
                            term: {
                              namespace: 'foo-namespace',
                            },
                          },
                        ],
                      },
                    },
                    {
                      bool: {
                        must: [
                          {
                            term: {
                              type: 'saved',
                            },
                          },
                          {
                            term: {
                              namespace: 'foo-namespace',
                            },
                          },
                        ],
                      },
                    },
                    {
                      bool: {
                        must: [
                          {
                            term: {
                              type: 'global',
                            },
                          },
                        ],
                        must_not: [
                          {
                            exists: {
                              field: 'namespace',
                            },
                          },
                        ],
                      },
                    },
                  ],
                  minimum_should_match: 1,
                },
              },
            ],
          },
        },
      });
    });
    it(' with search and searchFields', () => {
      expect(
        getQueryParams({
          mappings: MAPPINGS,
          schema: SCHEMA,
          namespace: 'foo-namespace',
          search: 'y*',
          searchFields: ['title'],
          kueryNode: {
            type: 'function',
            function: 'is',
            arguments: [
              { type: 'literal', value: 'global.name' },
              { type: 'literal', value: 'GLOBAL' },
              { type: 'literal', value: false },
            ],
          },
        })
      ).toEqual({
        query: {
          bool: {
            filter: [
              {
                bool: {
                  should: [
                    {
                      match: {
                        'global.name': 'GLOBAL',
                      },
                    },
                  ],
                  minimum_should_match: 1,
                },
              },
              {
                bool: {
                  should: [
                    {
                      bool: {
                        must: [
                          {
                            term: {
                              type: 'pending',
                            },
                          },
                          {
                            term: {
                              namespace: 'foo-namespace',
                            },
                          },
                        ],
                      },
                    },
                    {
                      bool: {
                        must: [
                          {
                            term: {
                              type: 'saved',
                            },
                          },
                          {
                            term: {
                              namespace: 'foo-namespace',
                            },
                          },
                        ],
                      },
                    },
                    {
                      bool: {
                        must: [
                          {
                            term: {
                              type: 'global',
                            },
                          },
                        ],
                        must_not: [
                          {
                            exists: {
                              field: 'namespace',
                            },
                          },
                        ],
                      },
                    },
                  ],
                  minimum_should_match: 1,
                },
              },
            ],
            must: [
              {
                simple_query_string: {
                  query: 'y*',
                  fields: ['pending.title', 'saved.title', 'global.title'],
                },
              },
            ],
          },
        },
      });
    });
  });
});
