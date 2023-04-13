/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { RequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import type { ContentManagementGetTransformsFn } from '@kbn/object-versioning';
import type { ContentRegistry } from '../core';

export interface Context {
  contentRegistry: ContentRegistry;
  requestHandlerContext: RequestHandlerContext;
  getTransformsFactory: (contentTypeId: string) => ContentManagementGetTransformsFn;
}
