/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { ScopedEsApi } from './tokens';
import { ResponseSizeLimitError } from '../step/errors';

export const DEFAULT_SCOPED_ES_RESPONSE_LIMIT = 256 * 1024 * 1024;

export class ScopedEs implements ScopedEsApi {
  constructor(
    private readonly clientForRequest: (scopeId: string) => ElasticsearchClient,
    private readonly maxResponseBytes = DEFAULT_SCOPED_ES_RESPONSE_LIMIT
  ) {}

  async request(
    params: Parameters<ElasticsearchClient['transport']['request']>[0] & { scopeId?: string }
  ): Promise<unknown> {
    const { scopeId, ...requestParams } = params;
    if (!scopeId) throw new Error('scopedEs.request requires scopeId');
    const response = await this.clientForRequest(scopeId).transport.request(
      requestParams as Parameters<ElasticsearchClient['transport']['request']>[0],
      {
        maxResponseSize: this.maxResponseBytes,
      }
    );
    const responseBytes = Buffer.byteLength(JSON.stringify(response), 'utf8');
    if (responseBytes > this.maxResponseBytes) {
      throw new ResponseSizeLimitError(this.maxResponseBytes, 'scopedEs.request', {
        actualBytes: responseBytes,
      });
    }
    return response;
  }
}
