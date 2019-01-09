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

interface RelationshipQueryOptions {
  type: string;
  id: string;
  namespace?: string;
  searchTypes?: string[];
}

export function getRelationshipsQuery(options: RelationshipQueryOptions) {
  const { type, id, namespace, searchTypes } = options;
  return {
    bool: {
      filter: {
        bool: {
          must: [
            ...(namespace
              ? [{ term: { namespace } }]
              : [{ bool: { must_not: { exists: { field: 'namespace' } } } }]),
            ...(searchTypes ? [{ terms: { type: searchTypes } }] : []),
            {
              nested: {
                path: 'references',
                query: {
                  bool: {
                    must: [
                      {
                        term: {
                          'references.id': id,
                        },
                      },
                      {
                        term: {
                          'references.type': type,
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
  };
}
