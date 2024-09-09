/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataViewSpec } from '@kbn/data-plugin/common';

import { INITIAL_REST_VERSION } from '@kbn/data-views-plugin/server/constants';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import { FtrService } from './ftr_provider_context';

export class IndexPatternsService extends FtrService {
  private readonly kibanaServer = this.ctx.getService('kibanaServer');

  /**
   * Create a new index pattern
   */
  async create(
    indexPattern: { title: string; timeFieldName?: string },
    { override } = { override: false },
    spaceId = ''
  ): Promise<DataViewSpec> {
    const response = await this.kibanaServer.request<{
      index_pattern: DataViewSpec;
    }>({
      path: `${spaceId}/api/index_patterns/index_pattern`,
      method: 'POST',
      body: {
        override,
        index_pattern: indexPattern,
      },
      headers: {
        [ELASTIC_HTTP_VERSION_HEADER]: INITIAL_REST_VERSION,
      },
    });

    return response.data.index_pattern;
  }
}
