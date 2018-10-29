/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EsClient } from '@code/esqueue';

import { Repository, RepositorySearchRequest, RepositorySearchResult } from '../../model';
import { RepositoryIndexNamePrefix, RepositoryReservedField } from '../indexer/schema';
import { Log } from '../log';
import { AbstractSearchClient } from './abstract_search_client';

export class RepositorySearchClient extends AbstractSearchClient {
  constructor(protected readonly client: EsClient, protected readonly log: Log) {
    super(client, log);
  }

  public async search(req: RepositorySearchRequest): Promise<RepositorySearchResult> {
    const resultsPerPage = this.getResultsPerPage(req);
    const from = (req.page - 1) * resultsPerPage;
    const size = resultsPerPage;
    const rawRes = await this.client.search({
      index: `${RepositoryIndexNamePrefix}*`,
      body: {
        from,
        size,
        query: {
          bool: {
            should: [
              {
                simple_query_string: {
                  query: req.query,
                  fields: [
                    `${RepositoryReservedField}.name^1.0`,
                    `${RepositoryReservedField}.org^1.0`,
                  ],
                  default_operator: 'or',
                  lenient: false,
                  analyze_wildcard: false,
                  boost: 1.0,
                },
              },
              // This prefix query is mostly for typeahead search.
              {
                prefix: {
                  [`${RepositoryReservedField}.name`]: {
                    value: req.query,
                    boost: 100.0,
                  },
                },
              },
            ],
            disable_coord: false,
            adjust_pure_negative: true,
            boost: 1.0,
          },
        },
      },
    });

    const hits: any[] = rawRes.hits.hits;
    const repos: Repository[] = hits.map(hit => {
      const repo: Repository = hit._source;
      return repo;
    });
    const result: RepositorySearchResult = {
      repositories: repos,
      took: rawRes.took,
      total: rawRes.hits.total,
    };
    return result;
  }
}
