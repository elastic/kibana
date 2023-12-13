/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { CoreSetup } from '@kbn/core/server';
import type {
  SearchIndexClient as ISearchIndexClient,
  SearchIndexClientFactory as ISearchIndexClientFactory,
  SearchIndexLogger,
} from './types';
import { SearchIndexClient } from './search_index_client';

export interface SearchIndexClientFactoryDependencies {
  /**
   * The prefix used for index names. Usually `.kibana`, as Elasticsearch
   * treats indices starting with the `.kibana*` prefix as a special indices
   * that only Kibana should be allowed to access.
   */
  baseName: string;
  kibanaVersion: string;
  logger: SearchIndexLogger;
}

export class SearchIndexClientFactory implements ISearchIndexClientFactory {
  constructor(private readonly deps: SearchIndexClientFactoryDependencies) {}

  public create(core: CoreSetup): ISearchIndexClient {
    const startServices = core.getStartServices();

    return new SearchIndexClient({
      ...this.deps,
      esClient: startServices.then(([{ elasticsearch }]) => elasticsearch.client.asInternalUser),
    });
  }
}
