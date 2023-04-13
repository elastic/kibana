/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { RequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import type { Version } from '@kbn/object-versioning';
import type { ContentRegistry, StorageContextGetTransformFn } from '../core';
import type { MSearchService } from '../core/msearch';

export interface Context {
  contentRegistry: ContentRegistry;
  requestHandlerContext: RequestHandlerContext;
  getTransformsFactory: (
    contentTypeId: string,
    requestVersion: Version,
    options?: { cacheEnabled?: boolean }
  ) => StorageContextGetTransformFn;
  mSearchService: MSearchService;
}
