/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { URL } from 'url';
import type { KibanaRouteOptions } from './request';
import type { Headers } from './headers';
import type { RouteConfigOptionsBody } from './route';

/**
 * Opaque placeholder for the HTTP framework's native request object.
 * The concrete type is an implementation detail; do not access it from plugins —
 * use {@link KibanaRequest} in route handlers.
 * @public
 */
export type OpaqueRawRequest = object;

/**
 * Represents a fake raw request.
 * Can be used to instantiate a `KibanaRequest`.
 */
export interface FakeRawRequest {
  /** The headers associated with the request. */
  headers: Headers;
  /** The path of the request */
  path: string;
  method?: string;
  url?: URL;
  app?: Record<string, unknown>;
  auth?: {
    isAuthenticated?: boolean;
  };
  route?: {
    settings?: {
      tags?: string[];
      app?: KibanaRouteOptions;
      payload?: RouteConfigOptionsBody;
    };
  };
}

/**
 * The underlying request passed to the HTTP server framework, or a forged
 * {@link FakeRawRequest} for tests and background jobs.
 * @public
 */
export type RawRequest = FakeRawRequest | OpaqueRawRequest;
