/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EsClient } from '@code/esqueue';

import { SearchRequest, SearchResult } from '../../model';
import { Log } from '../log';
import { SearchClient } from './search_client';

export abstract class AbstractSearchClient implements SearchClient {
  protected RESULTS_PER_PAGE = 20;

  constructor(protected readonly client: EsClient, protected readonly log: Log) {}

  public async search(req: SearchRequest): Promise<SearchResult> {
    // This is the abstract implementation, you should override this function.
    return new Promise<SearchResult>((resolve, reject) => {
      resolve();
    });
  }

  public getResultsPerPage(req: SearchRequest): number {
    let resultsPerPage = this.RESULTS_PER_PAGE;
    if (req.resultsPerPage !== undefined) {
      resultsPerPage = req.resultsPerPage;
    }
    return resultsPerPage;
  }
}
