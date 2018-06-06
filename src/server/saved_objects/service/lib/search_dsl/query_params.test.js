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
        .toEqual({});
    });
  });

  describe('{type}', () => {
    it('adds a term filter when a string', () => {
      expect(getQueryParams(MAPPINGS, 'saved'))
        .toEqual({
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

    it('adds a terms filter when an array', () => {
      expect(getQueryParams(MAPPINGS, ['saved', 'vis']))
        .toEqual({
          query: {
            bool: {
              filter: [
                {
                  terms: { type: ['saved', 'vis'] }
                }
              ]
            }
          }
        });
    });
  });

  describe('{type,filters}', () => {
    it('includes filters and a term filter for type when type is a string', () => {
      expect(getQueryParams(MAPPINGS, 'saved', null, null, [{ terms: { foo: ['bar', 'baz' ] } }]))
        .toEqual({
          query: {
            bool: {
              filter: [
                { terms: { foo: ['bar', 'baz' ] } },
                { term: { type: 'saved' } }
              ]
            }
          }
        });
    });

    it('includes filters and a terms filter for type when type is an array', () => {
      expect(getQueryParams(MAPPINGS, ['saved', 'vis'], null, null, [{ terms: { foo: ['bar', 'baz' ] } }]))
        .toEqual({
          query: {
            bool: {
              filter: [
                { terms: { foo: ['bar', 'baz' ] } },
                { terms: { type: ['saved', 'vis'] } }
              ]
            }
          }
        });
    });
  });

  describe('{search}', () => {
    it('includes just a sqs query', () => {
      expect(getQueryParams(MAPPINGS, null, 'us*'))
        .toEqual({
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

  describe('{search,filters}', () => {
    it('includes filters and a sqs query', () => {
      expect(getQueryParams(MAPPINGS, null, 'us*', null, [{ terms: { foo: ['bar', 'baz' ] } }]))
        .toEqual({
          query: {
            bool: {
              filter: [
                { terms: { foo: ['bar', 'baz' ] } }
              ],
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
    it('includes bool with sqs query and term filter for type when type is a string', () => {
      expect(getQueryParams(MAPPINGS, 'saved', 'y*'))
        .toEqual({
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
    it('includes bool with sqs query and terms filter for type when type is an array', () => {
      expect(getQueryParams(MAPPINGS, ['saved', 'vis'], 'y*'))
        .toEqual({
          query: {
            bool: {
              filter: [
                { terms: { type: ['saved', 'vis'] } }
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

  describe('{type,search,filters}', () => {
    it('includes bool with sqs query, filters and term filter for type when type is a string', () => {
      expect(getQueryParams(MAPPINGS, 'saved', 'y*', null, [{ terms: { foo: ['bar', 'baz' ] } }]))
        .toEqual({
          query: {
            bool: {
              filter: [
                { terms: { foo: ['bar', 'baz' ] } },
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

    it('includes bool with sqs query, filters and terms filter for type when type is an array', () => {
      expect(getQueryParams(MAPPINGS, ['saved', 'vis'], 'y*', null, [{ terms: { foo: ['bar', 'baz' ] } }]))
        .toEqual({
          query: {
            bool: {
              filter: [
                { terms: { foo: ['bar', 'baz' ] } },
                { terms: { type: ['saved', 'vis'] } }
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
        .toEqual({
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
    it('supports field boosting', () => {
      expect(getQueryParams(MAPPINGS, null, 'y*', ['title^3']))
        .toEqual({
          query: {
            bool: {
              must: [
                {
                  simple_query_string: {
                    query: 'y*',
                    fields: [
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
        .toEqual({
          query: {
            bool: {
              must: [
                {
                  simple_query_string: {
                    query: 'y*',
                    fields: [
                      'pending.title',
                      'saved.title',
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

  describe('{search,searchFields,filters}', () => {
    it('includes all types for field and includes filter', () => {
      expect(getQueryParams(MAPPINGS, null, 'y*', ['title'], [{ terms: { foo: ['bar', 'baz' ] } }]))
        .toEqual({
          query: {
            bool: {
              filter: [
                { terms: { foo: ['bar', 'baz' ] } },
              ],
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
    it('supports field boosting and includes filter', () => {
      expect(getQueryParams(MAPPINGS, null, 'y*', ['title^3'], [{ terms: { foo: ['bar', 'baz' ] } }]))
        .toEqual({
          query: {
            bool: {
              filter: [
                { terms: { foo: ['bar', 'baz' ] } },
              ],
              must: [
                {
                  simple_query_string: {
                    query: 'y*',
                    fields: [
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
    it('supports field and multi-field and includes filter', () => {
      expect(getQueryParams(MAPPINGS, null, 'y*', ['title', 'title.raw'], [{ terms: { foo: ['bar', 'baz' ] } }]))
        .toEqual({
          query: {
            bool: {
              filter: [
                { terms: { foo: ['bar', 'baz' ] } },
              ],
              must: [
                {
                  simple_query_string: {
                    query: 'y*',
                    fields: [
                      'pending.title',
                      'saved.title',
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

  describe('{type,search,searchFields}', () => {
    it('includes bool, with term filter and sqs with field list', () => {
      expect(getQueryParams(MAPPINGS, 'saved', 'y*', ['title']))
        .toEqual({
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
    it('includes bool, with terms filter and sqs with field list', () => {
      expect(getQueryParams(MAPPINGS, ['saved', 'vis'], 'y*', ['title']))
        .toEqual({
          query: {
            bool: {
              filter: [
                { terms: { type: ['saved', 'vis'] } }
              ],
              must: [
                {
                  simple_query_string: {
                    query: 'y*',
                    fields: [
                      'saved.title',
                      'vis.title'
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
        .toEqual({
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
        .toEqual({
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

  describe('{type,search,searchFields,filters}', () => {
    it('includes bool, with term filter and filter and sqs with field list', () => {
      expect(getQueryParams(MAPPINGS, 'saved', 'y*', ['title'], [{ terms: { foo: ['bar', 'baz' ] } }]))
        .toEqual({
          query: {
            bool: {
              filter: [
                { terms: { foo: ['bar', 'baz' ] } },
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
    it('includes bool, with terms filter and filter and sqs with field list', () => {
      expect(getQueryParams(MAPPINGS, ['saved', 'vis'], 'y*', ['title'], [{ terms: { foo: ['bar', 'baz' ] } }]))
        .toEqual({
          query: {
            bool: {
              filter: [
                { terms: { foo: ['bar', 'baz' ] } },
                { terms: { type: ['saved', 'vis'] } }
              ],
              must: [
                {
                  simple_query_string: {
                    query: 'y*',
                    fields: [
                      'saved.title',
                      'vis.title'
                    ]
                  }
                }
              ]
            }
          }
        });
    });
    it('supports fields pointing to multi-fields and filter', () => {
      expect(getQueryParams(MAPPINGS, 'saved', 'y*', ['title.raw'], [{ terms: { foo: ['bar', 'baz' ] } }]))
        .toEqual({
          query: {
            bool: {
              filter: [
                { terms: { foo: ['bar', 'baz' ] } },
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
    it('supports multiple search fields and filter', () => {
      expect(getQueryParams(MAPPINGS, 'saved', 'y*', ['title', 'title.raw'], [{ terms: { foo: ['bar', 'baz' ] } }]))
        .toEqual({
          query: {
            bool: {
              filter: [
                { terms: { foo: ['bar', 'baz' ] } },
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
