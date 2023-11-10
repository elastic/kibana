/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export function getAccessQuery({
  user,
  namespace,
}: {
  user: { name: string; id?: string };
  namespace?: string;
}) {
  return [
    {
      bool: {
        filter: [
          {
            bool: {
              should: [
                {
                  term: {
                    'user.name': user.name,
                  },
                },
                {
                  term: {
                    public: true,
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
                  term: {
                    namespace,
                  },
                },
                {
                  bool: {
                    must_not: {
                      exists: {
                        field: 'namespace',
                      },
                    },
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ];
}
