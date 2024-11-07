/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type {
  SavedObjectsBaseOptions,
  SavedObjectsIncrementCounterOptions,
  SavedObjectsDeleteByNamespaceOptions,
  SavedObjectsBulkResponse,
  SavedObjectsUpdateResponse,
  SavedObjectsBulkGetObject,
  SavedObjectsBulkResolveObject,
  SavedObjectsIncrementCounterField,
  SavedObjectsBulkCreateObject,
  SavedObjectsBulkResolveResponse,
  SavedObjectsCreateOptions,
  SavedObjectsFindResponse,
  SavedObjectsBulkUpdateResponse,
  SavedObjectsUpdateObjectsSpacesOptions,
  SavedObjectsCollectMultiNamespaceReferencesOptions,
  SavedObjectsRemoveReferencesToResponse,
  SavedObjectsCheckConflictsObject,
  SavedObjectsCheckConflictsResponse,
  SavedObjectsBulkUpdateOptions,
  SavedObjectsRemoveReferencesToOptions,
  SavedObjectsDeleteOptions,
  SavedObjectsOpenPointInTimeResponse,
  SavedObjectsBulkUpdateObject,
  SavedObjectsClosePointInTimeResponse,
  ISavedObjectsPointInTimeFinder,
  SavedObjectsCreatePointInTimeFinderDependencies,
  SavedObjectsResolveOptions,
  SavedObjectsResolveResponse,
  SavedObjectsCollectMultiNamespaceReferencesObject,
  SavedObjectsUpdateObjectsSpacesObject,
  SavedObjectsUpdateObjectsSpacesResponse,
  SavedObjectsUpdateOptions,
  SavedObjectsOpenPointInTimeOptions,
  SavedObjectsClosePointInTimeOptions,
  SavedObjectsCreatePointInTimeFinderOptions,
  SavedObjectsFindOptions,
  SavedObjectsGetOptions,
  SavedObjectsBulkDeleteObject,
  SavedObjectsBulkDeleteOptions,
  SavedObjectsBulkDeleteResponse,
  SavedObjectsFindInternalOptions,
  ISavedObjectsRepository,
} from '@kbn/core-saved-objects-api-server';
import type {
  ISavedObjectTypeRegistry,
  SavedObjectsExtensions,
  SavedObject,
} from '@kbn/core-saved-objects-server';
import {
  SavedObjectsSerializer,
  type IndexMapping,
  type IKibanaMigrator,
} from '@kbn/core-saved-objects-base-server-internal';
import { PointInTimeFinder } from './point_in_time_finder';
import { createRepositoryEsClient, type RepositoryEsClient } from './repository_es_client';
import type { RepositoryHelpers } from './apis/helpers';
import {
  type ApiExecutionContext,
  performCreate,
  performBulkCreate,
  performDelete,
  performCheckConflicts,
  performBulkDelete,
  performDeleteByNamespace,
  performFind,
  performBulkGet,
  performGet,
  performUpdate,
  performBulkUpdate,
  performRemoveReferencesTo,
  performOpenPointInTime,
  performIncrementCounter,
  performBulkResolve,
  performResolve,
  performUpdateObjectsSpaces,
  performCollectMultiNamespaceReferences,
} from './apis';
import { createRepositoryHelpers } from './utils';

/**
 * Constructor options for {@link SavedObjectsRepository}
 * @internal
 */
export interface SavedObjectsRepositoryOptions {
  index: string;
  mappings: IndexMapping;
  client: ElasticsearchClient;
  typeRegistry: ISavedObjectTypeRegistry;
  serializer: SavedObjectsSerializer;
  migrator: IKibanaMigrator;
  allowedTypes: string[];
  logger: Logger;
  extensions?: SavedObjectsExtensions;
}

/**
 * Saved Objects Repository - the client entry point for all saved object manipulation.
 *
 * The SOR calls the Elasticsearch client and leverages extension implementations to
 * support spaces, security, and encryption features.
 *
 * @internal
 */
export class SavedObjectsRepository implements ISavedObjectsRepository {
  private readonly migrator: IKibanaMigrator;
  private readonly mappings: IndexMapping;
  private readonly registry: ISavedObjectTypeRegistry;
  private readonly allowedTypes: string[];
  private readonly client: RepositoryEsClient;
  private readonly serializer: SavedObjectsSerializer;
  private readonly logger: Logger;
  private readonly apiExecutionContext: ApiExecutionContext;
  private readonly extensions: SavedObjectsExtensions;
  private readonly helpers: RepositoryHelpers;

  /**
   * A factory function for creating SavedObjectRepository instances.
   *
   * @internalRemarks Tests are located in ./repository_create_repository.test.ts
   *
   * @internal
   */
  public static createRepository(
    migrator: IKibanaMigrator,
    typeRegistry: ISavedObjectTypeRegistry,
    indexName: string,
    client: ElasticsearchClient,
    logger: Logger,
    includedHiddenTypes: string[] = [],
    extensions?: SavedObjectsExtensions,
    /** The injectedConstructor is only used for unit testing */
    injectedConstructor: any = SavedObjectsRepository
  ): ISavedObjectsRepository {
    const mappings = migrator.getActiveMappings();
    const allTypes = typeRegistry.getAllTypes().map((t) => t.name);
    const serializer = new SavedObjectsSerializer(typeRegistry);
    const visibleTypes = allTypes.filter((type) => !typeRegistry.isHidden(type));
    const allowedTypes = [...new Set(visibleTypes.concat(includedHiddenTypes))];
    const missingTypeMappings = includedHiddenTypes.filter((type) => !allTypes.includes(type));
    if (missingTypeMappings.length > 0) {
      throw new Error(
        `Missing mappings for saved objects types: '${missingTypeMappings.join(', ')}'`
      );
    }

    return new injectedConstructor({
      index: indexName,
      migrator,
      mappings,
      typeRegistry,
      serializer,
      allowedTypes,
      client,
      logger,
      extensions,
    });
  }

  private constructor(options: SavedObjectsRepositoryOptions) {
    const {
      index,
      mappings,
      client,
      typeRegistry,
      serializer,
      migrator,
      allowedTypes = [],
      logger,
      extensions = {},
    } = options;

    if (allowedTypes.length === 0) {
      throw new Error('Empty or missing types for saved object repository!');
    }

    this.migrator = migrator;
    this.mappings = mappings;
    this.registry = typeRegistry;
    this.client = createRepositoryEsClient(client);
    this.allowedTypes = allowedTypes;
    this.serializer = serializer;
    this.logger = logger;
    this.extensions = extensions;
    this.helpers = createRepositoryHelpers({
      logger,
      client: this.client,
      index,
      typeRegistry,
      serializer,
      extensions,
      migrator,
      createPointInTimeFinder: this.createPointInTimeFinder.bind(this),
    });
    this.apiExecutionContext = {
      client: this.client,
      extensions: this.extensions,
      helpers: this.helpers,
      allowedTypes: this.allowedTypes,
      registry: this.registry,
      serializer: this.serializer,
      migrator: this.migrator,
      mappings: this.mappings,
      logger: this.logger,
    };
  }

  /**
   * {@inheritDoc ISavedObjectsRepository.create}
   */
  public async create<T = unknown>(
    type: string,
    attributes: T,
    options: SavedObjectsCreateOptions = {}
  ): Promise<SavedObject<T>> {
    return await performCreate(
      {
        type,
        attributes,
        options,
      },
      this.apiExecutionContext
    );
  }

  /**
   * {@inheritDoc ISavedObjectsRepository.bulkCreate}
   */
  async bulkCreate<T = unknown>(
    objects: Array<SavedObjectsBulkCreateObject<T>>,
    options: SavedObjectsCreateOptions = {}
  ): Promise<SavedObjectsBulkResponse<T>> {
    return await performBulkCreate(
      {
        objects,
        options,
      },
      this.apiExecutionContext
    );
  }

  /**
   * {@inheritDoc ISavedObjectsRepository.checkConflicts}
   */
  async checkConflicts(
    objects: SavedObjectsCheckConflictsObject[] = [],
    options: SavedObjectsBaseOptions = {}
  ): Promise<SavedObjectsCheckConflictsResponse> {
    return await performCheckConflicts(
      {
        objects,
        options,
      },
      this.apiExecutionContext
    );
  }

  /**
   * {@inheritDoc ISavedObjectsRepository.delete}
   */
  async delete(type: string, id: string, options: SavedObjectsDeleteOptions = {}): Promise<{}> {
    return await performDelete(
      {
        type,
        id,
        options,
      },
      this.apiExecutionContext
    );
  }

  /**
   *  {@inheritDoc ISavedObjectsRepository.bulkDelete}
   */
  async bulkDelete(
    objects: SavedObjectsBulkDeleteObject[],
    options: SavedObjectsBulkDeleteOptions = {}
  ): Promise<SavedObjectsBulkDeleteResponse> {
    return await performBulkDelete(
      {
        objects,
        options,
      },
      this.apiExecutionContext
    );
  }

  /**
   * {@inheritDoc ISavedObjectsRepository.deleteByNamespace}
   */
  async deleteByNamespace(
    namespace: string,
    options: SavedObjectsDeleteByNamespaceOptions = {}
  ): Promise<any> {
    return await performDeleteByNamespace(
      {
        namespace,
        options,
      },
      this.apiExecutionContext
    );
  }

  /**
   * {@inheritDoc ISavedObjectsRepository.find}
   */
  async find<T = unknown, A = unknown>(
    options: SavedObjectsFindOptions,
    internalOptions: SavedObjectsFindInternalOptions = {}
  ): Promise<SavedObjectsFindResponse<T, A>> {
    return await performFind(
      {
        options,
        internalOptions,
      },
      this.apiExecutionContext
    );
  }

  /**
   * {@inheritDoc ISavedObjectsRepository.bulkGet}
   */
  async bulkGet<T = unknown>(
    objects: SavedObjectsBulkGetObject[] = [],
    options: SavedObjectsGetOptions = {}
  ): Promise<SavedObjectsBulkResponse<T>> {
    return await performBulkGet(
      {
        objects,
        options,
      },
      this.apiExecutionContext
    );
  }

  /**
   * {@inheritDoc ISavedObjectsRepository.bulkResolve}
   */
  async bulkResolve<T = unknown>(
    objects: SavedObjectsBulkResolveObject[],
    options: SavedObjectsResolveOptions = {}
  ): Promise<SavedObjectsBulkResolveResponse<T>> {
    return await performBulkResolve(
      {
        objects,
        options,
      },
      this.apiExecutionContext
    );
  }

  /**
   * {@inheritDoc ISavedObjectsRepository.get}
   */
  async get<T = unknown>(
    type: string,
    id: string,
    options: SavedObjectsGetOptions = {}
  ): Promise<SavedObject<T>> {
    return await performGet(
      {
        type,
        id,
        options,
      },
      this.apiExecutionContext
    );
  }

  /**
   * {@inheritDoc ISavedObjectsRepository.resolve}
   */
  async resolve<T = unknown>(
    type: string,
    id: string,
    options: SavedObjectsResolveOptions = {}
  ): Promise<SavedObjectsResolveResponse<T>> {
    return await performResolve(
      {
        type,
        id,
        options,
      },
      this.apiExecutionContext
    );
  }

  /**
   * {@inheritDoc ISavedObjectsRepository.update}
   */
  async update<T = unknown>(
    type: string,
    id: string,
    attributes: Partial<T>,
    options: SavedObjectsUpdateOptions<T> = {}
  ): Promise<SavedObjectsUpdateResponse<T>> {
    return await performUpdate(
      {
        type,
        id,
        attributes,
        options,
      },
      this.apiExecutionContext
    );
  }

  /**
   * {@inheritDoc ISavedObjectsRepository.collectMultiNamespaceReferences}
   */
  async collectMultiNamespaceReferences(
    objects: SavedObjectsCollectMultiNamespaceReferencesObject[],
    options: SavedObjectsCollectMultiNamespaceReferencesOptions = {}
  ) {
    return await performCollectMultiNamespaceReferences(
      {
        objects,
        options,
      },
      this.apiExecutionContext
    );
  }

  /**
   * {@inheritDoc ISavedObjectsRepository.updateObjectsSpaces}
   */
  async updateObjectsSpaces(
    objects: SavedObjectsUpdateObjectsSpacesObject[],
    spacesToAdd: string[],
    spacesToRemove: string[],
    options: SavedObjectsUpdateObjectsSpacesOptions = {}
  ): Promise<SavedObjectsUpdateObjectsSpacesResponse> {
    return await performUpdateObjectsSpaces(
      {
        objects,
        spacesToAdd,
        spacesToRemove,
        options,
      },
      this.apiExecutionContext
    );
  }

  /**
   * {@inheritDoc ISavedObjectsRepository.bulkUpdate}
   */
  async bulkUpdate<T = unknown>(
    objects: Array<SavedObjectsBulkUpdateObject<T>>,
    options: SavedObjectsBulkUpdateOptions = {}
  ): Promise<SavedObjectsBulkUpdateResponse<T>> {
    return await performBulkUpdate(
      {
        objects,
        options,
      },
      this.apiExecutionContext
    );
  }

  /**
   * {@inheritDoc ISavedObjectsRepository.removeReferencesTo}
   */
  async removeReferencesTo(
    type: string,
    id: string,
    options: SavedObjectsRemoveReferencesToOptions = {}
  ): Promise<SavedObjectsRemoveReferencesToResponse> {
    return await performRemoveReferencesTo(
      {
        type,
        id,
        options,
      },
      this.apiExecutionContext
    );
  }

  /**
   * {@inheritDoc ISavedObjectsRepository.incrementCounter}
   */
  async incrementCounter<T = unknown>(
    type: string,
    id: string,
    counterFields: Array<string | SavedObjectsIncrementCounterField>,
    options: SavedObjectsIncrementCounterOptions<T> = {}
  ) {
    return await performIncrementCounter(
      {
        type,
        id,
        counterFields,
        options,
      },
      this.apiExecutionContext
    );
  }

  /**
   * {@inheritDoc ISavedObjectsRepository.openPointInTimeForType}
   */
  async openPointInTimeForType(
    type: string | string[],
    options: SavedObjectsOpenPointInTimeOptions = {},
    internalOptions: SavedObjectsFindInternalOptions = {}
  ): Promise<SavedObjectsOpenPointInTimeResponse> {
    return await performOpenPointInTime(
      {
        type,
        options,
        internalOptions,
      },
      this.apiExecutionContext
    );
  }

  /**
   * {@inheritDoc ISavedObjectsRepository.closePointInTime}
   */
  async closePointInTime(
    id: string,
    options?: SavedObjectsClosePointInTimeOptions,
    internalOptions: SavedObjectsFindInternalOptions = {}
  ): Promise<SavedObjectsClosePointInTimeResponse> {
    const { disableExtensions } = internalOptions;
    if (!disableExtensions && this.extensions.securityExtension) {
      this.extensions.securityExtension.auditClosePointInTime();
    }

    return await this.client.closePointInTime({
      body: { id },
    });
  }

  /**
   * {@inheritDoc ISavedObjectsRepository.createPointInTimeFinder}
   */
  createPointInTimeFinder<T = unknown, A = unknown>(
    findOptions: SavedObjectsCreatePointInTimeFinderOptions,
    dependencies?: SavedObjectsCreatePointInTimeFinderDependencies,
    internalOptions?: SavedObjectsFindInternalOptions
  ): ISavedObjectsPointInTimeFinder<T, A> {
    return new PointInTimeFinder(findOptions, {
      logger: this.logger,
      client: this,
      ...dependencies,
      internalOptions,
    });
  }

  /**
   * {@inheritDoc ISavedObjectsRepository.getCurrentNamespace}
   */
  getCurrentNamespace(namespace?: string) {
    return this.helpers.common.getCurrentNamespace(namespace);
  }
}
