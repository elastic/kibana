/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { estypes } from '@elastic/elasticsearch';

import type { EsClient, EsSearchIndexDoc } from './types';
import type {
  SearchIndexClient as ISearchIndexClient,
  SearchIndexDoc,
  SearchIndexLogger,
} from './types';
import { SearchIndexNames } from './search_index_names';
import { SearchIndexInitializer } from './init/search_index_initializer';
import { docToDto } from './utils';

export interface SearchIndexClientDependencies {
  baseName: string;
  kibanaVersion: string;
  logger: SearchIndexLogger;
  esClient: Promise<EsClient>;
}

export class SearchIndexClient implements ISearchIndexClient {
  readonly #names: SearchIndexNames;

  constructor(private readonly deps: SearchIndexClientDependencies) {
    this.#names = new SearchIndexNames(deps.baseName);
  }

  public async initialize(): Promise<void> {
    const initializer = new SearchIndexInitializer({
      names: this.#names,
      kibanaVersion: this.deps.kibanaVersion,
      logger: this.deps.logger,
      esClient: this.deps.esClient,
    });
    await initializer.initialize();
  }

  public async add(docs: SearchIndexDoc[]): Promise<void> {
    if (docs.length === 0) return;

    const esClient = await this.deps.esClient;
    const operations: Array<estypes.BulkOperationContainer | Omit<EsSearchIndexDoc, 'id'>> = [];

    console.log('Adding documents to the search index...');
    console.log(JSON.stringify(docs, null, 2));

    for (const doc of docs) {
      const { id, ...dto } = docToDto(doc);

      operations.push({ create: { _id: id } }, dto);
    }

    const { errors } = await esClient.bulk(
      {
        index: this.#names.index,
        operations,
      },
      {
        maxRetries: 0,
      }
    );

    if (errors) {
      throw new Error('Some documents failed to be indexed.');
    }
  }
}
