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
  Acl,
  AclChange,
  AclObjectDecision,
  AclWarning,
  InitialAccess,
  StoredAcl,
} from '@kbn/ols';

/**
 * Repository operations that check object-level access. Consumer operations, such as running a
 * connector, are checked by the consumer.
 */
export type OlsRepositoryOperation = 'view' | 'edit' | 'delete';

/**
 * An object that the OLS extension decides access to.
 */
export interface OlsObject {
  type: string;
  id: string;
  /** The object's display name, for audit events. */
  name?: string;
  /** The spaces the object is in, for audit events and recovery checks. */
  namespaces?: string[];
  /** The stored ACL, or `undefined` when the object has none. */
  acl?: StoredAcl;
}

/**
 * The OLS extension enforces platform object-level security (OLS) for types that declare an access
 * policy. Unlike the other extensions, a scoped client cannot exclude it: it stays attached when a
 * client excludes the security extension, so that consumers with their own feature checks, such as
 * Actions, still enforce object-level access.
 *
 * Types without an access policy are always allowed and get no read filter.
 */
export interface ISavedObjectsOlsExtension {
  /**
   * Whether OLS is enforced for this request. Only the provider's trusted configuration sets it to
   * `false`, when OLS is deliberately disabled: then the extension adds no filters and denies
   * nothing, creates objects without an ACL, and refuses requested initial access and ACL changes.
   * An extension that cannot enforce OLS, for example because the provider is missing, is not a
   * disabled extension: it fails closed and reports `true`.
   */
  readonly enabled: boolean;

  /**
   * Returns one query clause per type with an access policy, built for the given spaces and keyed
   * by type. Types without a policy have no entry and need no clause.
   */
  getReadFilters(params: {
    namespacesByType: Map<string, string[]>;
  }): Promise<Map<string, estypes.QueryDslQueryContainer>>;

  /**
   * Decides an operation for each object, keyed by {@link getOlsObjectKey}. Objects of types
   * without an access policy have no entry, which means allowed.
   */
  authorizeObjects(params: {
    operation: OlsRepositoryOperation;
    namespace?: string;
    objects: OlsObject[];
  }): Promise<Map<string, AclObjectDecision>>;

  /**
   * Returns the ACL to store with a new object, or `undefined` when the object is created without
   * one. `id` is the ID the object is stored with, generated or not, so that the provider can audit
   * the creation. Throws a Saved Objects error when the requested access is not allowed.
   */
  getInitialAcl(params: {
    type: string;
    id: string;
    namespace?: string;
    requested?: InitialAccess;
  }): Promise<Acl | undefined>;

  /**
   * Authorizes an access change on an object and returns the ACL to store, with warnings about
   * principals who cannot use their access yet. It logs nothing about an allowed change itself: the
   * caller calls `commitAudit` once the change is stored. Throws a Saved Objects error when the
   * change is not allowed.
   */
  authorizeAclChange(params: {
    type: string;
    id: string;
    namespace?: string;
    name?: string;
    current?: StoredAcl;
    change: AclChange;
  }): Promise<{ next: Acl; warnings: AclWarning[]; commitAudit: () => void }>;
}

/**
 * Key of an object in the decisions returned by {@link ISavedObjectsOlsExtension.authorizeObjects}.
 */
export const getOlsObjectKey = (type: string, id: string) => `${type}:${id}`;
