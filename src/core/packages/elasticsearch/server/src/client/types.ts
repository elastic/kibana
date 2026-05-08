/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Headers, KibanaRequest } from '@kbn/core-http-server';
import type { SpaceId } from '@kbn/core-spaces-common';

/**
 * Fake request object created manually by Kibana plugins.
 * @public
 */
export interface FakeRequest {
  /** Headers used for authentication against Elasticsearch */
  headers: Headers;
  /**
   * The space ID this request is scoped to.
   * When set, this is the preferred mechanism for identifying the active space
   * in non-HTTP contexts (background tasks, scheduled jobs) instead of
   * constructing a fake URL with `/s/{spaceId}`.
   */
  spaceId?: SpaceId;
}

/**
 * A minimal synthetic request for space-level CPS routing (`projectRouting: 'space'`) in
 * non-HTTP contexts - for example, background tasks or scheduled jobs - where no real
 * {@link KibanaRequest} is available. Space resolution reads {@link FakeRequest.spaceId}
 * directly; the `url` field is retained for back-compat and is no longer consulted for
 * space derivation.
 *
 * In route handlers, pass the incoming {@link KibanaRequest} directly - it already satisfies
 * {@link ScopeableUrlRequest} without needing this type.
 * @public
 */
export interface UrlRequest extends FakeRequest {
  /**
   * @deprecated Set {@link FakeRequest.spaceId} instead. This field is no longer
   * consulted for space resolution and is retained only for back-compat.
   */
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
 * A request accepted by `asScoped` when `projectRouting: 'space'` is used.
 *
 * Covers both {@link KibanaRequest} (the typical caller from route handlers) and
 * {@link UrlRequest} (a lightweight synthetic alternative). Space resolution reads
 * `request.spaceId` directly via `getSpaceNPRE` from `@kbn/cps-server-utils`.
 *
 * @public
 */
export type ScopeableUrlRequest = KibanaRequest | UrlRequest;
