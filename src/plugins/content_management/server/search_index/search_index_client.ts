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

  public async add(docs: Array<{ id: string; doc: SearchIndexDoc }>): Promise<void> {
    if (docs.length === 0) return;

    const esClient = await this.deps.esClient;
    const operations: Array<estypes.BulkOperationContainer | EsSearchIndexDoc> = [];

    console.log('Adding documents...');
    console.log(JSON.stringify(docs, null, 2));

    for (const entry of docs) {
      const { id, doc } = entry;
      const dto = docToDto(doc);

      operations.push({ index: { _id: id } }, dto);
    }

    const { errors, items } = await esClient.bulk(
      {
        index: this.#names.index,
        operations,
      },
      {
        maxRetries: 0,
      }
    );

    if (errors) {
      console.log(JSON.stringify(items, null, 2));
      throw new Error('Some documents failed to be indexed xxxx.');
    }
  }

  public async update(docs: Array<{ id: string; doc: Partial<SearchIndexDoc> }>): Promise<void> {
    if (docs.length === 0) return;

    const esClient = await this.deps.esClient;
    const operations: Array<estypes.BulkOperationContainer | { doc: Partial<EsSearchIndexDoc> }> =
      [];

    console.log('Updating documents...');
    console.log(JSON.stringify(docs, null, 2));

    for (const entry of docs) {
      const { id, doc } = entry;
      const dto = docToDto(doc);

      operations.push({ update: { _id: id } }, { doc: dto });
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
      throw new Error('Some documents failed to be updated.');
    }
  }

  public async delete(docs: Array<{ id: string }>): Promise<void> {
    if (docs.length === 0) return;

    const esClient = await this.deps.esClient;
    const operations: estypes.BulkOperationContainer[] = [];

    console.log('Deleting documents...');
    console.log(JSON.stringify(docs, null, 2));

    for (const doc of docs) {
      operations.push({ delete: { _id: doc.id } });
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
      throw new Error('Some documents failed to be deleted.');
    }
  }
}
