/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { AuthenticatedUser } from '@kbn/core-security-common';
import type { APIKeysType } from './authentication';

/**
 * Internal brand marker for {@link OpaqueRequestState}.
 *
 * `OpaqueRequestState` is intentionally nominal: only Core/Security can
 * produce values of this type (via `serializeRequest`), and only Core/Security
 * can consume the inner shape (via `hydrateRequest`). Downstream code such as
 * Task Manager is limited to round-tripping the value through persistence,
 * which is exactly the ownership boundary this spike is exploring.
 *
 * The brand is exported as a `unique symbol` type so consumers can refer to
 * the brand in declarations (for example when typing a persisted SO field)
 * without being able to forge a value.
 *
 * @public
 */
export declare const opaqueRequestStateBrand: unique symbol;

/**
 * Opaque, serializable bag of request identity context.
 *
 * Producers (Core/Security) decide which fields to populate; consumers MUST
 * treat this as an opaque value and round-trip it untouched through
 * persistence.
 *
 * The type is branded so callers cannot construct an `OpaqueRequestState`
 * by hand — they must go through `CoreAuthenticationService.serializeRequest`.
 * Persisted (deserialized) values are coerced back into the branded type by
 * the consumer (for example Task Manager) at the trust boundary where they
 * are read from storage.
 *
 * Unknown additive keys should be preserved across versions to keep rolling
 * upgrades safe and avoid version-specific awareness in downstream consumers.
 *
 * @public
 */
export type OpaqueRequestState = Record<string, unknown> & {
  readonly [opaqueRequestStateBrand]: never;
};

/**
 * Core's authentication service
 *
 * @public
 */
export interface CoreAuthenticationService {
  /**
   * Retrieve the user bound to the provided request, or null if
   * no user is authenticated.
   *
   * @param request The request to retrieve the authenticated user for.
   */
  getCurrentUser(request: KibanaRequest): AuthenticatedUser | null;
  /**
   * Retrieve the redacted session ID for the provided request.
   * Returns a redacted form of the session ID (e.g. last N characters).
   * Returns undefined if no session exists for the request.
   *
   * @param request The request to retrieve the session ID for.
   */
  getRedactedSessionId(request: KibanaRequest): Promise<string | undefined>;
  /**
   * Serialize the identity context of the provided request into an opaque
   * `OpaqueRequestState` bag suitable for persistence.
   *
   * The shape is implementation-defined and may evolve across versions.
   * Callers must NOT inspect or mutate individual fields.
   *
   * @param request The authenticated request to serialize.
   * @returns An opaque request-state bag, or `undefined` when no meaningful
   * identity context could be captured (e.g. unauthenticated request, or
   * when no security implementation is registered).
   */
  serializeRequest(request: KibanaRequest): OpaqueRequestState | undefined;
  /**
   * Hydrate a scoped, fake `KibanaRequest` from a previously serialized
   * `OpaqueRequestState` bag.
   *
   * The returned request is intended for use in background execution paths
   * (e.g. Task Manager) that need to act on behalf of an originating user.
   *
   * @param requestState The opaque state captured at schedule time.
   * @returns A scoped `KibanaRequest`, or `undefined` when the state is empty
   * or no security implementation is registered to interpret it.
   */
  hydrateRequest(requestState: OpaqueRequestState): KibanaRequest | undefined;
  apiKeys: APIKeysType;
}
