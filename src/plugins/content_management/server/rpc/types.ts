/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { RequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { ContentRegistry } from '../core';
import type { MSearchService } from '../core/msearch';

export interface Context {
  contentRegistry: ContentRegistry;
  requestHandlerContext: RequestHandlerContext;
  request: KibanaRequest;
  mSearchService: MSearchService;
}
