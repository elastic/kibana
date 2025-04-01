/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CoreKibanaRequest } from '@kbn/core-http-router-server-internal';
import type {
  KibanaRequest,
  RawRequest,
  RouteValidator,
  RouteValidatorFullConfigRequest,
} from '@kbn/core-http-server';

/**
 * Allows building a KibanaRequest from a RawRequest, leveraging internal CoreKibanaRequest.
 * @param req The raw request to build from
 * @param routeSchemas The route schemas
 * @param withoutSecretHeaders Whether we want to exclude secret headers
 * @returns A KibanaRequest object
 */
export function kibanaRequestFactory<P, Q, B>(
  req: RawRequest,
  routeSchemas?: RouteValidator<P, Q, B> | RouteValidatorFullConfigRequest<P, Q, B>,
  withoutSecretHeaders: boolean = true
): KibanaRequest<P, Q, B> {
  return CoreKibanaRequest.from<P, Q, B>(req, routeSchemas, withoutSecretHeaders);
}

export function isCoreKibanaRequest<P, Q, B>(req: KibanaRequest<P, Q, B>) {
  return req instanceof CoreKibanaRequest;
}
