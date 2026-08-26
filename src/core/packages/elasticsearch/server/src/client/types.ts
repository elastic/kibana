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
  /** The space ID this request is scoped to. Used by CPS for space-level routing. */
  spaceId?: SpaceId;
}

/**
 * Union of all request types accepted by `asScoped`. Carries the credentials used to
 * authenticate Elasticsearch calls on behalf of the current user.
 *
 * Space-scoped CPS routing (`projectRouting: 'space'`) reads `request.spaceId` directly;
 * no URL field is needed.
 *
 * @public
 * See {@link KibanaRequest}, {@link FakeRequest}.
 */
export type ScopeableRequest = KibanaRequest | FakeRequest;
