/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/logging';
import type { RequestTiming } from '@kbn/core-http-server';
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
  SavedObjectsRawDocSource,
  SavedObjectsSearchOptions,
  SavedObjectsSearchResponse,
  SavedObjectsEsqlOptions,
  SavedObjectsEsqlResponse,
  ISavedObjectsRepository,
  SavedObjectsChangeAccessControlResponse,
  SavedObjectsChangeAccessControlObject,
  SavedObjectsChangeAccessModeOptions,
  SavedObjectsChangeOwnershipOptions,
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
  type ISavedObjectTypeRegistryInternal,
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
  performSearch,
  performEsql,
} from './apis';
import { createRepositoryHelpers } from './utils';
import { performChangeOwnership } from './apis/change_ownership';
import { performChangeAccessMode } from './apis/change_access_mode';

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
  serverTiming?: RequestTiming;
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
  private readonly serverTiming?: RequestTiming;

  /**
   * A factory function for creating SavedObjectRepository instances.
   *
   * @internalRemarks Tests are located in ./repository_create_repository.test.ts
   *
   * @internal
   */
  public static createRepository(
    migrator: IKibanaMigrator,
    typeRegistry: ISavedObjectTypeRegistryInternal,
    indexName: string,
    client: ElasticsearchClient,
    logger: Logger,
    includedHiddenTypes: string[] = [],
    extensions?: SavedObjectsExtensions,
    serverTiming?: RequestTiming,
    /** The injectedConstructor is only used for unit testing */
    injectedConstructor: any = SavedObjectsRepository
  ): ISavedObjectsRepository {
    const mappings = migrator.getActiveMappings();
    const allTypes = typeRegistry.getAllTypes().map((t) => t.name);
    const serializer = new SavedObjectsSerializer(typeRegistry);
    const visibleTypes = allTypes.filter((type) => !typeRegistry.isHidden(type));
    // Ensure includedHiddenTypes is an array, even if null or undefined was passed
    const safeIncludedHiddenTypes = Array.isArray(includedHiddenTypes) ? includedHiddenTypes : [];
    const allowedTypes = [...new Set(visibleTypes.concat(safeIncludedHiddenTypes))];
    const missingTypeMappings = safeIncludedHiddenTypes.filter((type) => !allTypes.includes(type));
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
      serverTiming,
    });
  }

  private constructor(private readonly options: SavedObjectsRepositoryOptions) {
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
      serverTiming,
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
    this.serverTiming = serverTiming;
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
    const timer = this.serverTiming?.start('so-create', type);
    try {
      return await performCreate(
        {
          type,
          attributes,
          options,
        },
        this.apiExecutionContext
      );
    } finally {
      timer?.end();
    }
  }

  /**
   * {@inheritDoc ISavedObjectsRepository.bulkCreate}
   */
  async bulkCreate<T = unknown>(
    objects: Array<SavedObjectsBulkCreateObject<T>>,
    options: SavedObjectsCreateOptions = {}
  ): Promise<SavedObjectsBulkResponse<T>> {
    const timer = this.serverTiming?.start('so-bulk-create');
    try {
      return await performBulkCreate(
        {
          objects,
          options,
        },
        this.apiExecutionContext
      );
    } finally {
      timer?.end();
    }
  }

  /**
   * {@inheritDoc ISavedObjectsRepository.checkConflicts}
   */
  async checkConflicts(
    objects: SavedObjectsCheckConflictsObject[] = [],
    options: SavedObjectsBaseOptions = {}
  ): Promise<SavedObjectsCheckConflictsResponse> {
    const timer = this.serverTiming?.start('so-check-conflicts');
    try {
      return await performCheckConflicts(
        {
          objects,
          options,
        },
        this.apiExecutionContext
      );
    } finally {
      timer?.end();
    }
  }

  /**
   * {@inheritDoc ISavedObjectsRepository.delete}
   */
  async delete(type: string, id: string, options: SavedObjectsDeleteOptions = {}): Promise<{}> {
    const timer = this.serverTiming?.start('so-delete', type);
    try {
      return await performDelete(
        {
          type,
          id,
          options,
        },
        this.apiExecutionContext
      );
    } finally {
      timer?.end();
    }
  }

  /**
   *  {@inheritDoc ISavedObjectsRepository.bulkDelete}
   */
  async bulkDelete(
    objects: SavedObjectsBulkDeleteObject[],
    options: SavedObjectsBulkDeleteOptions = {}
  ): Promise<SavedObjectsBulkDeleteResponse> {
    const timer = this.serverTiming?.start('so-bulk-delete');
    try {
      return await performBulkDelete(
        {
          objects,
          options,
        },
        this.apiExecutionContext
      );
    } finally {
      timer?.end();
    }
  }

  /**
   * {@inheritDoc ISavedObjectsRepository.deleteByNamespace}
   */
  async deleteByNamespace(
    namespace: string,
    options: SavedObjectsDeleteByNamespaceOptions = {}
  ): Promise<any> {
    const timer = this.serverTiming?.start('so-delete-by-namespace', namespace);
    try {
      return await performDeleteByNamespace(
        {
          namespace,
          options,
        },
        this.apiExecutionContext
      );
    } finally {
      timer?.end();
    }
  }

  /**
   * {@inheritDoc ISavedObjectsRepository.find}
   */
  async find<T = unknown, A = unknown>(
    options: SavedObjectsFindOptions,
    internalOptions: SavedObjectsFindInternalOptions = {}
  ): Promise<SavedObjectsFindResponse<T, A>> {
    const timer = this.serverTiming?.start('so-find');
    try {
      return await performFind(
        {
          options,
          internalOptions,
        },
        this.apiExecutionContext
      );
    } finally {
      timer?.end();
    }
  }

  /**
   * {@inheritDoc ISavedObjectsRepository.search}
   */
  async search<T extends SavedObjectsRawDocSource = SavedObjectsRawDocSource, A = unknown>(
    options: SavedObjectsSearchOptions
  ): Promise<SavedObjectsSearchResponse<T, A>> {
    const timer = this.serverTiming?.start('so-search');
    try {
      return await performSearch({ options }, this.apiExecutionContext);
    } finally {
      timer?.end();
    }
  }

  /**
   * {@inheritDoc ISavedObjectsRepository.esql}
   */
  async esql(options: SavedObjectsEsqlOptions): Promise<SavedObjectsEsqlResponse> {
    return performEsql({ options, rawClient: this.options.client }, this.apiExecutionContext);
  }

  /**
   * {@inheritDoc ISavedObjectsRepository.bulkGet}
   */
  async bulkGet<T = unknown>(
    objects: SavedObjectsBulkGetObject[] = [],
    options: SavedObjectsGetOptions = {}
  ): Promise<SavedObjectsBulkResponse<T>> {
    const timer = this.serverTiming?.start('so-bulk-get');
    try {
      return await performBulkGet(
        {
          objects,
          options,
        },
        this.apiExecutionContext
      );
    } finally {
      timer?.end();
    }
  }

  /**
   * {@inheritDoc ISavedObjectsRepository.bulkResolve}
   */
  async bulkResolve<T = unknown>(
    objects: SavedObjectsBulkResolveObject[],
    options: SavedObjectsResolveOptions = {}
  ): Promise<SavedObjectsBulkResolveResponse<T>> {
    const timer = this.serverTiming?.start('so-bulk-resolve');
    try {
      return await performBulkResolve(
        {
          objects,
          options,
        },
        this.apiExecutionContext
      );
    } finally {
      timer?.end();
    }
  }

  /**
   * {@inheritDoc ISavedObjectsRepository.get}
   */
  async get<T = unknown>(
    type: string,
    id: string,
    options: SavedObjectsGetOptions = {}
  ): Promise<SavedObject<T>> {
    const timer = this.serverTiming?.start('so-get', type);
    try {
      return await performGet(
        {
          type,
          id,
          options,
        },
        this.apiExecutionContext
      );
    } finally {
      timer?.end();
    }
  }

  /**
   * {@inheritDoc ISavedObjectsRepository.resolve}
   */
  async resolve<T = unknown>(
    type: string,
    id: string,
    options: SavedObjectsResolveOptions = {}
  ): Promise<SavedObjectsResolveResponse<T>> {
    const timer = this.serverTiming?.start('so-resolve', type);
    try {
      return await performResolve(
        {
          type,
          id,
          options,
        },
        this.apiExecutionContext
      );
    } finally {
      timer?.end();
    }
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
    const timer = this.serverTiming?.start('so-update', type);
    try {
      return await performUpdate(
        {
          type,
          id,
          attributes,
          options,
        },
        this.apiExecutionContext
      );
    } finally {
      timer?.end();
    }
  }

  /**
   * {@inheritDoc ISavedObjectsRepository.collectMultiNamespaceReferences}
   */
  async collectMultiNamespaceReferences(
    objects: SavedObjectsCollectMultiNamespaceReferencesObject[],
    options: SavedObjectsCollectMultiNamespaceReferencesOptions = {}
  ) {
    const timer = this.serverTiming?.start('so-collect-refs');
    try {
      return await performCollectMultiNamespaceReferences(
        {
          objects,
          options,
        },
        this.apiExecutionContext
      );
    } finally {
      timer?.end();
    }
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
    const timer = this.serverTiming?.start('so-update-spaces');
    try {
      return await performUpdateObjectsSpaces(
        {
          objects,
          spacesToAdd,
          spacesToRemove,
          options,
        },
        this.apiExecutionContext
      );
    } finally {
      timer?.end();
    }
  }

  /**
   * {@inheritDoc ISavedObjectsRepository.bulkUpdate}
   */
  async bulkUpdate<T = unknown>(
    objects: Array<SavedObjectsBulkUpdateObject<T>>,
    options: SavedObjectsBulkUpdateOptions = {}
  ): Promise<SavedObjectsBulkUpdateResponse<T>> {
    const timer = this.serverTiming?.start('so-bulk-update');
    try {
      return await performBulkUpdate(
        {
          objects,
          options,
        },
        this.apiExecutionContext
      );
    } finally {
      timer?.end();
    }
  }

  /**
   * {@inheritDoc ISavedObjectsRepository.removeReferencesTo}
   */
  async removeReferencesTo(
    type: string,
    id: string,
    options: SavedObjectsRemoveReferencesToOptions = {}
  ): Promise<SavedObjectsRemoveReferencesToResponse> {
    const timer = this.serverTiming?.start('so-remove-refs', type);
    try {
      return await performRemoveReferencesTo(
        {
          type,
          id,
          options,
        },
        this.apiExecutionContext
      );
    } finally {
      timer?.end();
    }
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
    const timer = this.serverTiming?.start('so-increment-counter', type);
    try {
      return await performIncrementCounter(
        {
          type,
          id,
          counterFields,
          options,
        },
        this.apiExecutionContext
      );
    } finally {
      timer?.end();
    }
  }

  /**
   * {@inheritDoc ISavedObjectsRepository.openPointInTimeForType}
   */
  async openPointInTimeForType(
    type: string | string[],
    options: SavedObjectsOpenPointInTimeOptions = {},
    internalOptions: SavedObjectsFindInternalOptions = {}
  ): Promise<SavedObjectsOpenPointInTimeResponse> {
    const timer = this.serverTiming?.start('so-open-pit');
    try {
      return await performOpenPointInTime(
        {
          type,
          options,
          internalOptions,
        },
        this.apiExecutionContext
      );
    } finally {
      timer?.end();
    }
  }

  /**
   * {@inheritDoc ISavedObjectsRepository.closePointInTime}
   */
  async closePointInTime(
    id: string,
    options?: SavedObjectsClosePointInTimeOptions,
    internalOptions: SavedObjectsFindInternalOptions = {}
  ): Promise<SavedObjectsClosePointInTimeResponse> {
    const timer = this.serverTiming?.start('so-close-pit');
    try {
      const { disableExtensions } = internalOptions;
      if (!disableExtensions && this.extensions.securityExtension) {
        this.extensions.securityExtension.auditClosePointInTime();
      }

      return await this.client.closePointInTime({ id });
    } finally {
      timer?.end();
    }
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

  /**
   * {@inheritDoc ISavedObjectsRepository.asScopedToNamespace}
   */
  asScopedToNamespace(namespace: string) {
    return new SavedObjectsRepository({
      ...this.options,
      extensions: {
        ...this.options.extensions,
        spacesExtension: this.extensions.spacesExtension?.asScopedToNamespace(namespace),
      },
    });
  }

  /**
   * {@inheritDoc ISavedObjectsRepository.changeOwnership}
   */
  async changeOwnership(
    objects: SavedObjectsChangeAccessControlObject[],
    options: SavedObjectsChangeOwnershipOptions
  ): Promise<SavedObjectsChangeAccessControlResponse> {
    const timer = this.serverTiming?.start('so-change-owner');
    try {
      return await performChangeOwnership({ objects, options }, this.apiExecutionContext);
    } finally {
      timer?.end();
    }
  }

  /**
   * {@inheritDoc ISavedObjectsRepository.changeAccessMode}
   */
  async changeAccessMode(
    objects: SavedObjectsChangeAccessControlObject[],
    options: SavedObjectsChangeAccessModeOptions
  ): Promise<SavedObjectsChangeAccessControlResponse> {
    const timer = this.serverTiming?.start('so-change-access');
    try {
      return await performChangeAccessMode({ objects, options }, this.apiExecutionContext);
    } finally {
      timer?.end();
    }
  }
}
