/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Headers, KibanaRequest } from '@kbn/core-http-server';

/**
 * Fake request object created manually by Kibana plugins.
 * @public
 */
export interface FakeRequest {
  /** Headers used for authentication against Elasticsearch */
  headers: Headers;
}

/**
 * A minimal synthetic request for space-level CPS routing (`projectRouting: 'space'`) in
 * non-HTTP contexts - for example, background tasks or scheduled jobs - where no real
 * {@link KibanaRequest} is available. The space is derived from the URL pathname
 * (e.g. `/s/<spaceId>/...`).
 *
 * In route handlers, pass the incoming {@link KibanaRequest} directly - it already satisfies
 * {@link ScopeableUrlRequest} without needing this type.
 * @public
 */
export interface UrlRequest extends FakeRequest {
  /** The URL of the request, used to extract the current space for CPS routing. */
  url: URL;
}

/**
 * Union of all request types accepted by `asScoped`. Carries the credentials used to
 * authenticate Elasticsearch calls on behalf of the current user.
 *
 * @public
 * See {@link KibanaRequest}, {@link FakeRequest}.
 */
export type ScopeableRequest = KibanaRequest | FakeRequest;

/**
 * A request that carries a URL, accepted by `asScoped` when `projectRouting: 'space'` is used.
 *
 * Covers both {@link KibanaRequest} (the typical caller from route handlers, whose URL is set by
 * the HTTP layer) and {@link UrlRequest} (a lightweight synthetic alternative for programmatic
 * use). In both cases the space is extracted from the URL pathname (e.g. `/s/<spaceId>/...`).
 *
 * @public
 */
export type ScopeableUrlRequest = KibanaRequest | UrlRequest;
