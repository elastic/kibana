/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup } from '@kbn/core/server';
import type { EventStreamClient, EventStreamClientFactory, EventStreamLogger } from '../types';
import { EsEventStreamClient } from './es_event_stream_client';

export interface EsEventStreamClientFactoryDependencies {
  /**
   * The prefix used for index names. Usually `.kibana`, as Elasticsearch
   * treats indices starting with the `.kibana*` prefix as a special indices
   * that only Kibana should be allowed to access.
   */
  baseName: string;
  kibanaVersion: string;
  logger: EventStreamLogger;
}

export class EsEventStreamClientFactory implements EventStreamClientFactory {
  constructor(private readonly deps: EsEventStreamClientFactoryDependencies) {}

  public create(core: CoreSetup): EventStreamClient {
    const startServices = core.getStartServices();

    return new EsEventStreamClient({
      ...this.deps,
      esClient: startServices.then(([{ elasticsearch }]) => elasticsearch.client.asInternalUser),
    });
  }
}
