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
 * Internal brand marker for {@link CallerSnapshot}.
 *
 * `CallerSnapshot` is nominally typed: only Core/Security can produce values
 * of this type (via `captureCaller`, `stampCaller`, or `adoptPersistedCaller`).
 * The brand makes construction sites visible at code-review time without
 * preventing read access to documented fields.
 *
 * The brand is exported as a `unique symbol` type so consumers can refer to
 * it in declarations (e.g. when typing a persisted SO field) without being
 * able to forge a value.
 *
 * @public
 */
export declare const callerSnapshotBrand: unique symbol;

/**
 * Frozen, point-in-time capture of the caller's identity context (auth
 * credential, space, profile) suitable for replaying a deferred operation on
 * their behalf. Owned by Core/Security.
 *
 * You may read the documented fields if you need them. You must NOT construct
 * a `CallerSnapshot` from an object literal — always mint via `captureCaller`,
 * `stampCaller`, or `adoptPersistedCaller`. The brand makes those construction
 * sites visible in code review; the on-disk encoding is Core's and may evolve
 * additively.
 *
 * @public
 */
export interface CallerSnapshot {
  readonly [callerSnapshotBrand]: never;
  readonly v: number;
  readonly authorization?: string;
  readonly spaceId?: string;
  readonly userProfileId?: string;
}

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
   * Capture the frozen identity context of the provided request as a
   * `CallerSnapshot` suitable for persistence and later replay.
   *
   * The snapshot stamps the resolved user profile at capture time so
   * background runs can act on behalf of the originating user without
   * re-resolving identity. Returns `undefined` when no meaningful identity
   * context is available (e.g. unauthenticated request, or no security
   * implementation registered).
   *
   * @param request The authenticated request to capture.
   */
  captureCaller(request: KibanaRequest): Promise<CallerSnapshot | undefined>;
  /**
   * Replay a scoped, fake `KibanaRequest` from a previously captured
   * `CallerSnapshot`.
   *
   * The returned request is an adapter for the existing scoped-client API
   * surface — pass it to `core.savedObjects.getScopedClient(request)`,
   * `core.elasticsearch.client.asScoped(request)`, etc. The durable identity
   * is the `CallerSnapshot` itself; consumers that can keep the snapshot in
   * their data model should do so and call `replayCaller` only at the point
   * where they hand off to a scoped-client factory.
   *
   * Returns `undefined` when the snapshot is empty, has an unrecognised
   * shape, or no security implementation is registered.
   *
   * @param snapshot The identity context captured at schedule time.
   */
  replayCaller(snapshot: CallerSnapshot): KibanaRequest | undefined;
  /**
   * Narrow mint helper for migrations and tests. Constructs a `CallerSnapshot`
   * from explicitly provided parts without requiring a live `KibanaRequest`.
   * Returns `undefined` when no auth-bearing field is provided.
   */
  stampCaller(parts: {
    authorization?: string;
    spaceId?: string;
    userProfileId?: string;
  }): CallerSnapshot | undefined;
  /**
   * Persistence trust boundary. Coerces a value read from storage into a
   * `CallerSnapshot` after a minimal structural check (`v` is a number).
   * Returns `undefined` for clearly-invalid shapes (non-object, missing `v`).
   * Field-level validation is deferred to `replayCaller`.
   */
  adoptPersistedCaller(persisted: unknown): CallerSnapshot | undefined;
  apiKeys: APIKeysType;
}
