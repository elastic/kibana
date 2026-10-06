/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Type, ValidationError } from '@kbn/config-schema';
import type { KibanaRequest } from '@kbn/core/server';
import type { RequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import type { ContentRegistry, StorageContext } from '../core';
import type { GetTransformsFactoryFn } from '../types';
export declare const validate: (input: unknown, schema: Type<any>) => ValidationError | null;
export declare const getStorageContext: ({
  request,
  contentTypeId,
  version: _version,
  ctx: { contentRegistry, requestHandlerContext, getTransformsFactory },
}: {
  request: KibanaRequest;
  contentTypeId: string;
  version?: number;
  ctx: {
    contentRegistry: ContentRegistry;
    requestHandlerContext: RequestHandlerContext;
    getTransformsFactory: GetTransformsFactoryFn;
  };
}) => StorageContext;
