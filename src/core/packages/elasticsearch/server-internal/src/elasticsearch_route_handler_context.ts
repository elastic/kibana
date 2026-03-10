/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type {
  IScopedClusterClient,
  ElasticsearchRequestHandlerContext,
} from '@kbn/core-elasticsearch-server';
import type { InternalElasticsearchServiceStart } from './types';

/**
 * The {@link ElasticsearchRequestHandlerContext} implementation.
 * @internal
 */
export class CoreElasticsearchRouteHandlerContext implements ElasticsearchRequestHandlerContext {
  #client?: IScopedClusterClient;

  constructor(
    private readonly elasticsearchStart: InternalElasticsearchServiceStart,
    private readonly request: KibanaRequest
  ) {}

  public get client() {
    if (this.#client == null) {
      // TODO [CPS routing]: this client currently preserves the existing "origin-only" behavior.
      //   Review and choose one of the following options:
      //   A) Still unsure? Leave this comment as-is.
      //   B) Confirmed origin-only is correct? Replace this TODO with a concise explanation of why.
      //   C) Want to use current space’s NPRE (Named Project Routing Expression)? Change 'origin-only' to 'space' and remove this comment.
      //      Note: 'space' requires the request passed to asScoped() to carry a `url: URL` property.
      this.#client = this.elasticsearchStart.client.asScoped(this.request, { projectRouting: 'origin-only' });
    }
    return this.#client;
  }
}
