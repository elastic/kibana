/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { URL } from 'url';
import type { Request, RouteOptionsPayload } from '@hapi/hapi';
import type { KibanaRouteOptions } from './request';
import type { Headers } from './headers';

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
      payload?: RouteOptionsPayload;
    };
  };
}

export type RawRequest = Request | FakeRawRequest;
