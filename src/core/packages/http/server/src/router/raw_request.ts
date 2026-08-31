/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { URL } from 'url';
import type { Request, RouteOptionsPayload } from '@hapi/hapi';
import type { SpaceId } from '@kbn/core-spaces-common';
import type { KibanaRouteOptions } from './request';
import type { Headers } from './headers';

/**
 * Represents a fake raw request.
 * Can be used to instantiate a `KibanaRequest`.
 */
export interface FakeRawRequest {
  /** The headers associated with the request. */
  headers: Headers;
  /** The path of the request. Defaults to `/` when omitted. */
  path?: string;
  /** The space this request is scoped to. Defaults to the default space when omitted. */
  spaceId?: SpaceId;
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

// @hapi/hapi v21.4.10 widened the default `Query`/`Params`/`Headers` request types to
// `unknown` (https://github.com/hapijs/hapi/pull/4562). Kibana's HTTP stack assumes the
// previous narrower shapes, so restore them via the supported `ReqRefDefaults` override.
declare module '@hapi/hapi' {
  interface ReqRefDefaults {
    Headers: Record<string, string | string[] | undefined>;
    Query: { [key: string]: string | string[] | undefined };
    Params: Record<string, string>;
  }
}
