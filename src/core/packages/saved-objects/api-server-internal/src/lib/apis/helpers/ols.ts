/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
import {
  ACL_FIELD,
  normalizeAclSource,
  type AclChange,
  type AclInput,
  type AclObjectDecision,
} from '@kbn/ols';
import {
  SavedObjectsErrorHelpers,
  getAclObjectKey,
  type AclOperation,
  type ISavedObjectsOlsExtension,
  type ISavedObjectTypeRegistry,
  type SavedObjectsRawDocSource,
} from '@kbn/core-saved-objects-server';

export type IOlsHelper = Pick<OlsHelper, keyof OlsHelper>;

/**
 * Object to authorize, with the raw source the ACL is read from.
 */
export interface OlsHelperObject {
  type: string;
  id: string;
  source?: SavedObjectsRawDocSource;
  /** Space the object is read from, when it differs from the operation's namespace. */
  namespace?: string;
}

/**
 * Applies platform object-level security in repository operations. Only types with an access
 * policy are checked, and only when the repository has an OLS extension: repositories built
 * without one are system paths.
 */
export class OlsHelper {
  private readonly registry: ISavedObjectTypeRegistry;
  private readonly olsExtension?: ISavedObjectsOlsExtension;

  constructor({
    registry,
    olsExtension,
  }: {
    registry: ISavedObjectTypeRegistry;
    olsExtension?: ISavedObjectsOlsExtension;
  }) {
    this.registry = registry;
    this.olsExtension = olsExtension;
  }

  /**
   * Whether repository operations on the type enforce object-level security.
   */
  public isEnforced(type: string) {
    return !!this.olsExtension && !!this.registry.getAccessPolicy(type);
  }

  /**
   * Throws for an operation that object-level security cannot protect yet, when any of the types is
   * enforced.
   */
  public rejectUnsupported(types: string[], operation: string) {
    const enforcedType = types.find((type) => this.isEnforced(type));
    if (enforcedType) {
      throw SavedObjectsErrorHelpers.createBadRequestError(
        `${operation} is not supported for type ${enforcedType}, which has an access policy`
      );
    }
  }

  /**
   * Decides the operation for every object of an enforced type. Objects without a decision are
   * allowed.
   */
  public async authorize(
    operation: AclOperation,
    namespace: string | undefined,
    objects: OlsHelperObject[]
  ): Promise<Map<string, AclObjectDecision>> {
    const enforcedObjects = objects.filter(({ type }) => this.isEnforced(type));
    if (!this.olsExtension || enforcedObjects.length === 0) {
      return new Map();
    }

    // Recovery authority is granted per space, so objects are decided in the space they belong to.
    const objectsByNamespace = new Map<string | undefined, OlsHelperObject[]>();
    for (const object of enforcedObjects) {
      const objectNamespace = object.namespace ?? namespace;
      objectsByNamespace.set(objectNamespace, [
        ...(objectsByNamespace.get(objectNamespace) ?? []),
        object,
      ]);
    }

    const decisions = new Map<string, AclObjectDecision>();
    for (const [objectNamespace, namespaceObjects] of objectsByNamespace) {
      const namespaceDecisions = await this.olsExtension.authorizeObjects({
        operation,
        namespace: objectNamespace,
        objects: namespaceObjects.map(({ type, id, source }) => ({
          type,
          id,
          acl: normalizeAclSource(source),
        })),
      });
      namespaceDecisions.forEach((decision, key) => decisions.set(key, decision));
    }
    return decisions;
  }

  /**
   * Throws the error for a denied operation on a single object.
   */
  public async enforce(
    operation: AclOperation,
    namespace: string | undefined,
    object: OlsHelperObject
  ) {
    const decisions = await this.authorize(operation, namespace, [object]);
    const error = this.getError(decisions, object);
    if (error) {
      throw error;
    }
  }

  /**
   * Returns the error for a denied object, or `undefined` when the operation is allowed. An object
   * the caller cannot view is reported as missing.
   */
  public getError(decisions: Map<string, AclObjectDecision>, { type, id }: OlsHelperObject) {
    const decision = decisions.get(getAclObjectKey(type, id));
    if (decision?.status === 'not_found') {
      return SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
    }

    if (decision?.status === 'forbidden') {
      return SavedObjectsErrorHelpers.decorateForbiddenError(
        new Error(
          `Unable to ${decision.operation} ${type}: missing "${decision.operation}" permission`
        )
      );
    }
  }

  /**
   * Returns the ACL to store with a new object. Only enforced types accept requested access.
   */
  public async getInitialAcl(type: string, namespace: string | undefined, requested?: AclInput) {
    if (!this.olsExtension || !this.registry.getAccessPolicy(type)) {
      if (requested) {
        throw SavedObjectsErrorHelpers.createBadRequestError(
          `Type ${type} does not support object-level security (OLS)`
        );
      }
      return;
    }

    // Documents always carry the stored ACL shape, the same as documents read from Elasticsearch.
    const acl = await this.olsExtension.getInitialAcl({ type, namespace, requested });
    return normalizeAclSource({ [ACL_FIELD]: acl });
  }

  /**
   * Authorizes an access change on a visible object and returns the ACL to store.
   */
  public async authorizeChange(
    namespace: string | undefined,
    { type, id, source }: OlsHelperObject,
    change: AclChange
  ) {
    if (!this.olsExtension || !this.registry.getAccessPolicy(type)) {
      throw SavedObjectsErrorHelpers.createBadRequestError(
        `Type ${type} does not support object-level security (OLS)`
      );
    }

    return await this.olsExtension.authorizeAclChange({
      namespace,
      object: { type, id, acl: normalizeAclSource(source) },
      change,
    });
  }

  /**
   * Returns the read clause of each enforced type, for the spaces each type is searched in.
   */
  public async getReadFilters(
    namespacesByType: Map<string, string[]>
  ): Promise<Map<string, estypes.QueryDslQueryContainer>> {
    const enforced = new Map([...namespacesByType].filter(([type]) => this.isEnforced(type)));
    if (!this.olsExtension || enforced.size === 0) {
      return new Map();
    }

    return await this.olsExtension.getReadFilters({ namespacesByType: enforced });
  }

  /**
   * Runs an operation in the extension's audit scope, when there is an extension.
   */
  public async runInAuditScope<T>(operation: () => Promise<T>): Promise<T> {
    return this.olsExtension
      ? await this.olsExtension.runInAuditScope(operation)
      : await operation();
  }
}
