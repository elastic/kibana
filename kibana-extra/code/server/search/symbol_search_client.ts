/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EsClient } from '@code/esqueue';
import { DetailSymbolInformation } from '@code/lsp-extension';

import { SymbolSearchRequest, SymbolSearchResult } from '../../model';
import { SymbolIndexNamePrefix } from '../indexer/schema';
import { Log } from '../log';
import { AbstractSearchClient } from './abstract_search_client';

export class SymbolSearchClient extends AbstractSearchClient {
  constructor(protected readonly client: EsClient, protected readonly log: Log) {
    super(client, log);
  }

  public async findByQname(qname: string): Promise<SymbolSearchResult> {
    const [from, size] = [0, 1];
    const rawRes = await this.client.search({
      index: `${SymbolIndexNamePrefix}*`,
      body: {
        from,
        size,
        query: {
          term: {
            qname,
          },
        },
      },
    });
    return this.handleResults(rawRes);
  }

  public async search(req: SymbolSearchRequest): Promise<SymbolSearchResult> {
    const resultsPerPage = this.getResultsPerPage(req);
    const from = (req.page - 1) * resultsPerPage;
    const size = resultsPerPage;
    const rawRes = await this.client.search({
      index: `${SymbolIndexNamePrefix}*`,
      body: {
        from,
        size,
        query: {
          bool: {
            should: [
              {
                prefix: {
                  'symbolInformation.name': {
                    value: req.query,
                    boost: 1.0,
                  },
                },
              },
              {
                term: {
                  'symbolInformation.name': {
                    value: req.query,
                    boost: 10.0,
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

    return this.handleResults(rawRes);
  }

  private handleResults(rawRes: any) {
    const hits: any[] = rawRes.hits.hits;
    const symbols: DetailSymbolInformation[] = hits.map(hit => {
      const symbol: DetailSymbolInformation = hit._source;
      return symbol;
    });
    const result: SymbolSearchResult = {
      symbols,
      took: rawRes.took,
      total: rawRes.hits.total,
    };
    return result;
  }
}
