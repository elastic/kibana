/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Client } from '@elastic/elasticsearch';

interface ClientOptions {
  node: string;
  username: string;
  password: string;
}

interface Labels {
  journeyName: string;
  maxUsersCount: string;
}

interface Request {
  method: string;
  headers: string;
  body?: { original: string };
}

interface Response {
  status_code: number;
}

interface Transaction {
  id: string;
  name: string;
  type: string;
}

export interface Document {
  labels: Labels;
  character: string;
  quote: string;
  service: { version: string };
  processor: string;
  trace: { id: string };
  '@timestamp': string;
  environment: string;
  url: { path: string };
  http: {
    request: Request;
    response: Response;
  };
  transaction: Transaction;
}

export function initClient(options: ClientOptions) {
  const client = new Client({
    node: options.node,
    auth: {
      username: options.username,
      password: options.password,
    },
  });

  return {
    async getTransactions(buildId: string, journeyName: string) {
      const result = await client.search<Document>({
        body: {
          track_total_hits: true,
          sort: [
            {
              '@timestamp': {
                order: 'desc',
                unmapped_type: 'boolean',
              },
            },
          ],
          size: 10000,
          stored_fields: ['*'],
          _source: true,
          query: {
            bool: {
              must: [],
              filter: [
                {
                  bool: {
                    filter: [
                      {
                        bool: {
                          should: [
                            {
                              match_phrase: {
                                'transaction.type': 'request',
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
                              match_phrase: {
                                'processor.event': 'transaction',
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
                              match_phrase: {
                                'labels.testBuildId': buildId,
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
                              match_phrase: {
                                'labels.journeyName': journeyName,
                              },
                            },
                          ],
                          minimum_should_match: 1,
                        },
                      },
                    ],
                  },
                },
              ],
              should: [],
              must_not: [],
            },
          },
        },
      });
      return result?.hits?.hits;
    },
  };
}
