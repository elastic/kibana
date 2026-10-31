/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
import type {
  AclDecision,
  AclInput,
  AclObjectDecision,
  CanonicalAcl,
  Principal,
} from '@kbn/access-control';
import type { KibanaRequest } from '@kbn/core-http-server';

/**
 * Platform object-level security for code outside the Saved Objects repository, such as connector
 * execution. Policies come from the types registered with an `accessPolicy`.
 *
 * @public
 */
export interface CoreAccessControlService {
  /**
   * Whether platform object-level security is enforced. When it is not, consumers keep their
   * behavior from before platform object-level security.
   */
  isEnabled(): boolean;

  /**
   * Returns the service scoped to a request. Within one request, the principal is resolved at most
   * once and recovery authority is checked at most once per type and space.
   *
   * `principal` is only for a credential minted in the same request on behalf of that principal,
   * which the request's own lookup cannot find yet. Feature privileges still come from the request.
   */
  asScoped(request: KibanaRequest, options?: { principal?: Principal }): CoreScopedAccessControl;
}

/**
 * @public
 */
export interface CoreScopedAccessControl {
  /**
   * Whether platform object-level security is enforced. When it is not, consumers keep their
   * behavior from before platform object-level security.
   */
  isEnabled(): boolean;

  /**
   * Returns the principal the request acts as, if any. Throws when the lookup itself fails.
   */
  getPrincipal(): Promise<Principal | undefined>;

  /**
   * Returns the full decision for one object, including recovery, limited by the request's feature
   * privileges for each operation of the type's policy.
   */
  evaluate(params: { type: string; spaceId: string; acl?: CanonicalAcl }): Promise<AclDecision>;

  /**
   * Decides one operation for objects of one type, keyed by object ID. Objects whose general
   * access permits the operation need no lookup. Denials and access that relied on a grant or on
   * recovery are audited.
   */
  authorize(params: {
    type: string;
    spaceId: string;
    operation: string;
    objects: Array<{ id: string; acl?: CanonicalAcl }>;
  }): Promise<Map<string, AclObjectDecision>>;

  /**
   * Keeps the objects the request can view.
   */
  filterVisible<T extends { id: string; acl?: CanonicalAcl }>(params: {
    type: string;
    spaceId: string;
    objects: T[];
  }): Promise<T[]>;

  /**
   * Returns the clause that keeps the objects of a type the request can view in the given spaces,
   * or `undefined` when nothing needs to be filtered.
   */
  getReadFilter(params: {
    type: string;
    spaceIds: string[];
  }): Promise<estypes.QueryDslQueryContainer | undefined>;

  /**
   * Checks requested initial access before creation side effects run. Throws a bad request error
   * when it is not allowed.
   */
  validateInitialAcl(params: {
    type: string;
    spaceId: string;
    requested?: AclInput;
  }): Promise<void>;

  /**
   * Stores a recovery answer the caller already has from its own privilege request, so that no
   * second privilege request is needed.
   */
  primeRecovery(type: string, spaceIds: string[], granted: boolean): void;
}
