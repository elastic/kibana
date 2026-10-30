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
  AclChange,
  AclDocument,
  AclInput,
  AclObjectDecision,
  AclWarning,
  CanonicalAcl,
} from '@kbn/access-control';

/**
 * Repository operations that check object-level access. Consumer operations such as connector
 * execution are checked by the consumer.
 */
export type AclOperation = 'view' | 'edit' | 'delete';

export interface AclObject {
  type: string;
  id: string;
  acl?: CanonicalAcl;
}

/**
 * The ACL extension enforces platform object-level security for types that declare an access
 * policy. Unlike the other extensions, it cannot be excluded from a scoped client: it stays attached
 * when a client excludes the security extension, so that consumers with their own feature checks,
 * such as Actions, still enforce object-level access.
 *
 * The repository calls it after the security extension, so feature authorization decides first and
 * the privilege request that authorizes the operation also answers the recovery check.
 */
export interface ISavedObjectsAclExtension {
  /**
   * Returns a query clause per registered type, built for the given spaces. Unregistered types have
   * no entry and need no clause.
   */
  getReadFilters(params: {
    namespacesByType: Map<string, string[]>;
  }): Promise<Map<string, estypes.QueryDslQueryContainer>>;

  /**
   * Decides an operation for each object, keyed by `type:id`. Objects of unregistered types are
   * always allowed.
   */
  authorizeObjects(params: {
    operation: AclOperation;
    namespace?: string;
    objects: AclObject[];
  }): Promise<Map<string, AclObjectDecision>>;

  /**
   * Returns the ACL to store with a new object, or `undefined` when the object is created without
   * one. Throws a Saved Objects error when the requested access is not allowed.
   */
  getInitialAcl(params: {
    type: string;
    namespace?: string;
    requested?: AclInput;
  }): Promise<AclDocument | undefined>;

  /**
   * Authorizes an access change on a visible object and returns the ACL to store. Throws a Saved
   * Objects error when the change is not allowed.
   */
  authorizeAclChange(params: {
    namespace?: string;
    object: AclObject;
    change: AclChange;
  }): Promise<{ next: AclDocument; warnings: AclWarning[] }>;

  /**
   * Runs a repository operation with audit events held until it completes. Events that other
   * extensions write about an object this extension denied are dropped, so that a hidden object is
   * logged only as an object-level denial.
   */
  runInAuditScope<T>(operation: () => Promise<T>): Promise<T>;
}

/**
 * Key of an object in the decisions returned by {@link ISavedObjectsAclExtension.authorizeObjects}.
 */
export const getAclObjectKey = (type: string, id: string) => `${type}:${id}`;
