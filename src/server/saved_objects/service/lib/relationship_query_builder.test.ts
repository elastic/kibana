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

import { getRelationshipsQuery } from './relationship_query_builder';

test('Filters a targeted type for a source object', () => {
  const query = getRelationshipsQuery({ type: 'search', id: '123' });
  expect(query).toMatchInlineSnapshot(`
Object {
  "bool": Object {
    "filter": Object {
      "bool": Object {
        "must": Array [
          Object {
            "bool": Object {
              "must_not": Object {
                "exists": Object {
                  "field": "namespace",
                },
              },
            },
          },
          Object {
            "nested": Object {
              "path": "references",
              "query": Object {
                "bool": Object {
                  "must": Array [
                    Object {
                      "term": Object {
                        "references.id": "123",
                      },
                    },
                    Object {
                      "term": Object {
                        "references.type": "search",
                      },
                    },
                  ],
                },
              },
            },
          },
        ],
      },
    },
  },
}
`);
});

test('Filters by namespace', () => {
  const query = getRelationshipsQuery({
    type: 'search',
    id: '123',
    namespace: 'my-namespace',
  });
  expect(query).toMatchInlineSnapshot(`
Object {
  "bool": Object {
    "filter": Object {
      "bool": Object {
        "must": Array [
          Object {
            "term": Object {
              "namespace": "my-namespace",
            },
          },
          Object {
            "nested": Object {
              "path": "references",
              "query": Object {
                "bool": Object {
                  "must": Array [
                    Object {
                      "term": Object {
                        "references.id": "123",
                      },
                    },
                    Object {
                      "term": Object {
                        "references.type": "search",
                      },
                    },
                  ],
                },
              },
            },
          },
        ],
      },
    },
  },
}
`);
});
