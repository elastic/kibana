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

import { getQueryParams } from './query_params';

const MAPPINGS = {
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
    },
    global: {
      properties: {
        name: {
          type: 'keyword',
        }
      }
    }
  }
};

const SCHEMA = {
  isNamespaceAgnostic: type => type === 'global',
};


// create a type clause to be used within the "should", if a namespace is specified
// the clause will ensure the namespace matches; otherwise, the clause will ensure
// that there isn't a namespace field.
const createTypeClause = (type, namespace) => {
  if (namespace) {
    return {
      bool: {
        must: [
          { term: { type } },
          { term: { namespace } },
        ]
      }
    };
  }

  return {
    bool: {
      must: [{ term: { type } }],
      must_not: [{ exists: { field: 'namespace' } }]
    }
  };
};

describe('searchDsl/queryParams', () => {
  describe('no parameters', () => {
    it('searches for all known types without a namespace specified', () => {
      expect(getQueryParams(MAPPINGS, SCHEMA))
        .toEqual({
          query: {
            bool: {
              filter: [{
                bool: {
                  should: [
                    createTypeClause('pending'),
                    createTypeClause('saved'),
                    createTypeClause('global'),
                  ],
                  minimum_should_match: 1
                }
              }]
            }
          }
        });
    });
  });

  describe('namespace', () => {
    it('filters namespaced types for namespace, and ensures namespace agnostic types have no namespace', () => {
      expect(getQueryParams(MAPPINGS, SCHEMA, 'foo-namespace'))
        .toEqual({
          query: {
            bool: {
              filter: [{
                bool: {
                  should: [
                    createTypeClause('pending', 'foo-namespace'),
                    createTypeClause('saved', 'foo-namespace'),
                    createTypeClause('global'),
                  ],
                  minimum_should_match: 1
                }
              }]
            }
          }
        });
    });
  });

  describe('type (singular, namespaced)', () => {
    it('includes a terms filter for type and namespace not being specified', () => {
      expect(getQueryParams(MAPPINGS, SCHEMA, null, 'saved'))
        .toEqual({
          query: {
            bool: {
              filter: [{
                bool: {
                  should: [
                    createTypeClause('saved'),
                  ],
                  minimum_should_match: 1
                }
              }]
            }
          }
        });
    });
  });

  describe('type (singular, global)', () => {
    it('includes a terms filter for type and namespace not being specified', () => {
      expect(getQueryParams(MAPPINGS, SCHEMA, null, 'global'))
        .toEqual({
          query: {
            bool: {
              filter: [{
                bool: {
                  should: [
                    createTypeClause('global'),
                  ],
                  minimum_should_match: 1
                }
              }]
            }
          }
        });
    });
  });

  describe('type (plural, namespaced and global)', () => {
    it('includes term filters for types and namespace not being specified', () => {
      expect(getQueryParams(MAPPINGS, SCHEMA, null, ['saved', 'global']))
        .toEqual({
          query: {
            bool: {
              filter: [{
                bool: {
                  should: [
                    createTypeClause('saved'),
                    createTypeClause('global'),
                  ],
                  minimum_should_match: 1
                }
              }]
            }
          }
        });
    });
  });

  describe('namespace, type (plural, namespaced and global)', () => {
    it('includes a terms filter for type and namespace not being specified', () => {
      expect(getQueryParams(MAPPINGS, SCHEMA, 'foo-namespace', ['saved', 'global']))
        .toEqual({
          query: {
            bool: {
              filter: [{
                bool: {
                  should: [
                    createTypeClause('saved', 'foo-namespace'),
                    createTypeClause('global'),
                  ],
                  minimum_should_match: 1
                }
              }]
            }
          }
        });
    });
  });

  describe('search', () => {
    it('includes a sqs query and all known types without a namespace specified', () => {
      expect(getQueryParams(MAPPINGS, SCHEMA, null, null, 'us*'))
        .toEqual({
          query: {
            bool: {
              filter: [{
                bool: {
                  should: [
                    createTypeClause('pending'),
                    createTypeClause('saved'),
                    createTypeClause('global'),
                  ],
                  minimum_should_match: 1
                }
              }],
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

  describe('namespace, search', () => {
    it('includes a sqs query and namespaced types with the namespace and global types without a namespace', () => {
      expect(getQueryParams(MAPPINGS, SCHEMA, 'foo-namespace', null, 'us*'))
        .toEqual({
          query: {
            bool: {
              filter: [{
                bool: {
                  should: [
                    createTypeClause('pending', 'foo-namespace'),
                    createTypeClause('saved', 'foo-namespace'),
                    createTypeClause('global'),
                  ],
                  minimum_should_match: 1
                }
              }],
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

  describe('type (plural, namespaced and global), search', () => {
    it('includes a sqs query and types without a namespace', () => {
      expect(getQueryParams(MAPPINGS, SCHEMA, null, ['saved', 'global'], 'us*'))
        .toEqual({
          query: {
            bool: {
              filter: [{
                bool: {
                  should: [
                    createTypeClause('saved'),
                    createTypeClause('global'),
                  ],
                  minimum_should_match: 1
                }
              }],
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

  describe('namespace, type (plural, namespaced and global), search', () => {
    it('includes a sqs query and namespace type with a namespace and global type without a namespace', () => {
      expect(getQueryParams(MAPPINGS, SCHEMA, 'foo-namespace', ['saved', 'global'], 'us*'))
        .toEqual({
          query: {
            bool: {
              filter: [{
                bool: {
                  should: [
                    createTypeClause('saved', 'foo-namespace'),
                    createTypeClause('global'),
                  ],
                  minimum_should_match: 1
                }
              }],
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

  describe('search, searchFields', () => {
    it('includes all types for field', () => {
      expect(getQueryParams(MAPPINGS, SCHEMA, null, null, 'y*', ['title']))
        .toEqual({
          query: {
            bool: {
              filter: [{
                bool: {
                  should: [
                    createTypeClause('pending'),
                    createTypeClause('saved'),
                    createTypeClause('global'),
                  ],
                  minimum_should_match: 1
                }
              }],
              must: [
                {
                  simple_query_string: {
                    query: 'y*',
                    fields: [
                      'pending.title',
                      'saved.title',
                      'global.title',
                    ]
                  }
                }
              ]
            }
          }
        });
    });
    it('supports field boosting', () => {
      expect(getQueryParams(MAPPINGS, SCHEMA, null, null, 'y*', ['title^3']))
        .toEqual({
          query: {
            bool: {
              filter: [{
                bool: {
                  should: [
                    createTypeClause('pending'),
                    createTypeClause('saved'),
                    createTypeClause('global'),
                  ],
                  minimum_should_match: 1
                }
              }],
              must: [
                {
                  simple_query_string: {
                    query: 'y*',
                    fields: [
                      'pending.title^3',
                      'saved.title^3',
                      'global.title^3',
                    ]
                  }
                }
              ]
            }
          }
        });
    });
    it('supports field and multi-field', () => {
      expect(getQueryParams(MAPPINGS, SCHEMA, null, null, 'y*', ['title', 'title.raw']))
        .toEqual({
          query: {
            bool: {
              filter: [{
                bool: {
                  should: [
                    createTypeClause('pending'),
                    createTypeClause('saved'),
                    createTypeClause('global'),
                  ],
                  minimum_should_match: 1
                }
              }],
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
                    ]
                  }
                }
              ]
            }
          }
        });
    });
  });

  describe('namespace, search, searchFields', () => {
    it('includes all types for field', () => {
      expect(getQueryParams(MAPPINGS, SCHEMA, 'foo-namespace', null, 'y*', ['title']))
        .toEqual({
          query: {
            bool: {
              filter: [{
                bool: {
                  should: [
                    createTypeClause('pending', 'foo-namespace'),
                    createTypeClause('saved', 'foo-namespace'),
                    createTypeClause('global'),
                  ],
                  minimum_should_match: 1
                }
              }],
              must: [
                {
                  simple_query_string: {
                    query: 'y*',
                    fields: [
                      'pending.title',
                      'saved.title',
                      'global.title',
                    ]
                  }
                }
              ]
            }
          }
        });
    });
    it('supports field boosting', () => {
      expect(getQueryParams(MAPPINGS, SCHEMA, 'foo-namespace', null, 'y*', ['title^3']))
        .toEqual({
          query: {
            bool: {
              filter: [{
                bool: {
                  should: [
                    createTypeClause('pending', 'foo-namespace'),
                    createTypeClause('saved', 'foo-namespace'),
                    createTypeClause('global'),
                  ],
                  minimum_should_match: 1
                }
              }],
              must: [
                {
                  simple_query_string: {
                    query: 'y*',
                    fields: [
                      'pending.title^3',
                      'saved.title^3',
                      'global.title^3',
                    ]
                  }
                }
              ]
            }
          }
        });
    });
    it('supports field and multi-field', () => {
      expect(getQueryParams(MAPPINGS, SCHEMA, 'foo-namespace', null, 'y*', ['title', 'title.raw']))
        .toEqual({
          query: {
            bool: {
              filter: [{
                bool: {
                  should: [
                    createTypeClause('pending', 'foo-namespace'),
                    createTypeClause('saved', 'foo-namespace'),
                    createTypeClause('global'),
                  ],
                  minimum_should_match: 1
                }
              }],
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
                    ]
                  }
                }
              ]
            }
          }
        });
    });
  });

  describe('type (plural, namespaced and global), search, searchFields', () => {
    it('includes all types for field', () => {
      expect(getQueryParams(MAPPINGS, SCHEMA, null, ['saved', 'global'], 'y*', ['title']))
        .toEqual({
          query: {
            bool: {
              filter: [{
                bool: {
                  should: [
                    createTypeClause('saved'),
                    createTypeClause('global'),
                  ],
                  minimum_should_match: 1
                }
              }],
              must: [
                {
                  simple_query_string: {
                    query: 'y*',
                    fields: [
                      'saved.title',
                      'global.title',
                    ]
                  }
                }
              ]
            }
          }
        });
    });
    it('supports field boosting', () => {
      expect(getQueryParams(MAPPINGS, SCHEMA, null, ['saved', 'global'], 'y*', ['title^3']))
        .toEqual({
          query: {
            bool: {
              filter: [{
                bool: {
                  should: [
                    createTypeClause('saved'),
                    createTypeClause('global'),
                  ],
                  minimum_should_match: 1
                }
              }],
              must: [
                {
                  simple_query_string: {
                    query: 'y*',
                    fields: [
                      'saved.title^3',
                      'global.title^3',
                    ]
                  }
                }
              ]
            }
          }
        });
    });
    it('supports field and multi-field', () => {
      expect(getQueryParams(MAPPINGS, SCHEMA, null, ['saved', 'global'], 'y*', ['title', 'title.raw']))
        .toEqual({
          query: {
            bool: {
              filter: [{
                bool: {
                  should: [
                    createTypeClause('saved'),
                    createTypeClause('global'),
                  ],
                  minimum_should_match: 1
                }
              }],
              must: [
                {
                  simple_query_string: {
                    query: 'y*',
                    fields: [
                      'saved.title',
                      'global.title',
                      'saved.title.raw',
                      'global.title.raw',
                    ]
                  }
                }
              ]
            }
          }
        });
    });
  });

  describe('namespace, type (plural, namespaced and global), search, searchFields', () => {
    it('includes all types for field', () => {
      expect(getQueryParams(MAPPINGS, SCHEMA, 'foo-namespace', ['saved', 'global'], 'y*', ['title']))
        .toEqual({
          query: {
            bool: {
              filter: [{
                bool: {
                  should: [
                    createTypeClause('saved', 'foo-namespace'),
                    createTypeClause('global'),
                  ],
                  minimum_should_match: 1
                }
              }],
              must: [
                {
                  simple_query_string: {
                    query: 'y*',
                    fields: [
                      'saved.title',
                      'global.title',
                    ]
                  }
                }
              ]
            }
          }
        });
    });
    it('supports field boosting', () => {
      expect(getQueryParams(MAPPINGS, SCHEMA, 'foo-namespace', ['saved', 'global'], 'y*', ['title^3']))
        .toEqual({
          query: {
            bool: {
              filter: [{
                bool: {
                  should: [
                    createTypeClause('saved', 'foo-namespace'),
                    createTypeClause('global'),
                  ],
                  minimum_should_match: 1
                }
              }],
              must: [
                {
                  simple_query_string: {
                    query: 'y*',
                    fields: [
                      'saved.title^3',
                      'global.title^3',
                    ]
                  }
                }
              ]
            }
          }
        });
    });
    it('supports field and multi-field', () => {
      expect(getQueryParams(MAPPINGS, SCHEMA, 'foo-namespace', ['saved', 'global'], 'y*', ['title', 'title.raw']))
        .toEqual({
          query: {
            bool: {
              filter: [{
                bool: {
                  should: [
                    createTypeClause('saved', 'foo-namespace'),
                    createTypeClause('global'),
                  ],
                  minimum_should_match: 1
                }
              }],
              must: [
                {
                  simple_query_string: {
                    query: 'y*',
                    fields: [
                      'saved.title',
                      'global.title',
                      'saved.title.raw',
                      'global.title.raw',
                    ]
                  }
                }
              ]
            }
          }
        });
    });
  });

  describe('type (plural, namespaced and global), search, defaultSearchOperator', () => {
    it('supports defaultSearchOperator', () => {
      expect(getQueryParams(MAPPINGS, SCHEMA, 'foo-namespace', ['saved', 'global'], 'foo', null, 'AND'))
        .toEqual({
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
                    all_fields: true,
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
      expect(getQueryParams(MAPPINGS, SCHEMA, 'foo-namespace', ['saved', 'global'], null, null, 'OR', { type: 'bar', id: '1' }))
        .toEqual({
          query: {
            bool: {
              filter: [{
                bool: {
                  must: [{
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
                  }],
                  should: [
                    createTypeClause('saved', 'foo-namespace'),
                    createTypeClause('global'),
                  ],
                  minimum_should_match: 1,
                }
              }]
            }
          }
        });
    });
  });
});
