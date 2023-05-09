/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isNotFoundFromUnsupportedServer } from '@kbn/core-elasticsearch-server-internal';
import type {
  ISavedObjectTypeRegistry,
  ISavedObjectsSerializer,
} from '@kbn/core-saved-objects-server';
import { ISavedObjectsRepository } from '@kbn/core-saved-objects-api-server';
import { SavedObjectsUtils } from '@kbn/core-saved-objects-utils-server';
import { SavedObjectsErrorHelpers, SavedObjectsRawDocSource } from '@kbn/core-saved-objects-server';
import { rawDocExistsInNamespaces } from '../internal_utils';
import { getSavedObjectNamespaces } from '../utils/namespaces';
import { GetResponseFound, isFoundGetResponse } from '../utils/es_responses';
import {
  preflightCheckForCreate,
  PreflightCheckForCreateObject,
} from '../preflight_check_for_create';
import type { RepositoryEsClient } from '../repository_es_client';

export class PreflightCheckHelper {
  private registry: ISavedObjectTypeRegistry;
  private serializer: ISavedObjectsSerializer;
  private client: RepositoryEsClient;
  private getIndexForType: (type: string) => string;
  private createPointInTimeFinder: ISavedObjectsRepository['createPointInTimeFinder'];

  constructor({
    registry,
    serializer,
    client,
    getIndexForType,
    createPointInTimeFinder,
  }: {
    registry: ISavedObjectTypeRegistry;
    serializer: ISavedObjectsSerializer;
    client: RepositoryEsClient;
    getIndexForType: (type: string) => string;
    createPointInTimeFinder: ISavedObjectsRepository['createPointInTimeFinder'];
  }) {
    this.registry = registry;
    this.serializer = serializer;
    this.client = client;
    this.getIndexForType = getIndexForType;
    this.createPointInTimeFinder = createPointInTimeFinder;
  }

  public async preflightCheckForCreate(objects: PreflightCheckForCreateObject[]) {
    return await preflightCheckForCreate({
      objects,
      registry: this.registry,
      client: this.client,
      serializer: this.serializer,
      getIndexForType: this.getIndexForType.bind(this),
      createPointInTimeFinder: this.createPointInTimeFinder.bind(this),
    });
  }

  /**
   * Pre-flight check to ensure that a multi-namespace object exists in the current namespace.
   */
  public async preflightCheckNamespaces({
    type,
    id,
    namespace,
    initialNamespaces,
  }: PreflightCheckNamespacesParams): Promise<PreflightCheckNamespacesResult> {
    if (!this.registry.isMultiNamespace(type)) {
      throw new Error(`Cannot make preflight get request for non-multi-namespace type '${type}'.`);
    }

    const { body, statusCode, headers } = await this.client.get<SavedObjectsRawDocSource>(
      {
        id: this.serializer.generateRawId(undefined, type, id),
        index: this.getIndexForType(type),
      },
      {
        ignore: [404],
        meta: true,
      }
    );

    const namespaces = initialNamespaces ?? [SavedObjectsUtils.namespaceIdToString(namespace)];

    const indexFound = statusCode !== 404;
    if (indexFound && isFoundGetResponse(body)) {
      if (!rawDocExistsInNamespaces(this.registry, body, namespaces)) {
        return { checkResult: 'found_outside_namespace' };
      }
      return {
        checkResult: 'found_in_namespace',
        savedObjectNamespaces: initialNamespaces ?? getSavedObjectNamespaces(namespace, body),
        rawDocSource: body,
      };
    } else if (isNotFoundFromUnsupportedServer({ statusCode, headers })) {
      // checking if the 404 is from Elasticsearch
      throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
    }
    return {
      checkResult: 'not_found',
      savedObjectNamespaces: initialNamespaces ?? getSavedObjectNamespaces(namespace),
    };
  }

  /**
   * Pre-flight check to ensure that an upsert which would create a new object does not result in an alias conflict.
   */
  public async preflightCheckForUpsertAliasConflict(
    type: string,
    id: string,
    namespace: string | undefined
  ) {
    const namespaceString = SavedObjectsUtils.namespaceIdToString(namespace);
    const [{ error }] = await preflightCheckForCreate({
      registry: this.registry,
      client: this.client,
      serializer: this.serializer,
      getIndexForType: this.getIndexForType.bind(this),
      createPointInTimeFinder: this.createPointInTimeFinder.bind(this),
      objects: [{ type, id, namespaces: [namespaceString] }],
    });
    if (error?.type === 'aliasConflict') {
      throw SavedObjectsErrorHelpers.createConflictError(type, id);
    }
    // any other error from this check does not matter
  }
}

/**
 * @internal
 */
export interface PreflightCheckNamespacesParams {
  /** The object type to fetch */
  type: string;
  /** The object ID to fetch */
  id: string;
  /** The current space */
  namespace: string | undefined;
  /** Optional; for an object that is being created, this specifies the initial namespace(s) it will exist in (overriding the current space) */
  initialNamespaces?: string[];
}

/**
 * @internal
 */
export interface PreflightCheckNamespacesResult {
  /** If the object exists, and whether or not it exists in the current space */
  checkResult: 'not_found' | 'found_in_namespace' | 'found_outside_namespace';
  /**
   * What namespace(s) the object should exist in, if it needs to be created; practically speaking, this will never be undefined if
   * checkResult == not_found or checkResult == found_in_namespace
   */
  savedObjectNamespaces?: string[];
  /** The source of the raw document, if the object already exists */
  rawDocSource?: GetResponseFound<SavedObjectsRawDocSource>;
}
