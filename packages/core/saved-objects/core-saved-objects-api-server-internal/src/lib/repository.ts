/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isObject } from 'lodash';
import Boom from '@hapi/boom';
import type { Payload } from '@hapi/boom';
import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import {
  isSupportedEsServer,
  isNotFoundFromUnsupportedServer,
} from '@kbn/core-elasticsearch-server-internal';
import type { BulkResolveError } from '@kbn/core-saved-objects-server';
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
import {
  type SavedObjectSanitizedDoc,
  type SavedObjectsRawDoc,
  type SavedObjectsRawDocSource,
  type ISavedObjectTypeRegistry,
  type SavedObjectsExtensions,
  type ISavedObjectsEncryptionExtension,
  type ISavedObjectsSecurityExtension,
  type ISavedObjectsSpacesExtension,
  AuthorizeUpdateObject,
  type SavedObject,
} from '@kbn/core-saved-objects-server';
import { DEFAULT_NAMESPACE_STRING } from '@kbn/core-saved-objects-utils-server';
import { SavedObjectsErrorHelpers, type DecoratedError } from '@kbn/core-saved-objects-server';
import { ALL_NAMESPACES_STRING, SavedObjectsUtils } from '@kbn/core-saved-objects-utils-server';
import {
  SavedObjectsSerializer,
  encodeVersion,
  encodeHitVersion,
  type IndexMapping,
  type IKibanaMigrator,
} from '@kbn/core-saved-objects-base-server-internal';
import { PointInTimeFinder } from './point_in_time_finder';
import { createRepositoryEsClient, type RepositoryEsClient } from './repository_es_client';
import { getSearchDsl } from './search_dsl';
import { internalBulkResolve, isBulkResolveError } from './internal_bulk_resolve';
import {
  getBulkOperationError,
  getCurrentTime,
  getExpectedVersionProperties,
  normalizeNamespace,
  rawDocExistsInNamespace,
  errorContent,
  type Either,
  isLeft,
  isRight,
  isMgetDoc,
} from './internal_utils';
import { collectMultiNamespaceReferences } from './collect_multi_namespace_references';
import { updateObjectsSpaces } from './update_objects_spaces';
import {
  RepositoryHelpers,
  CommonHelper,
  EncryptionHelper,
  ValidationHelper,
  PreflightCheckHelper,
  SerializerHelper,
  type PreflightCheckNamespacesResult,
} from './helpers';
import { DEFAULT_REFRESH_SETTING, DEFAULT_RETRY_COUNT } from './constants';
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
} from './apis';

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
 * Saved Objects Respositiry - the client entry point for saved object manipulation.
 *
 * The SOR calls the Elasticsearch client and leverages extension implementations to
 * support spaces, security, and encryption features.
 *
 * @public
 */
export class SavedObjectsRepository implements ISavedObjectsRepository {
  private _migrator: IKibanaMigrator;
  private _mappings: IndexMapping;
  private _registry: ISavedObjectTypeRegistry;
  private _allowedTypes: string[];
  private readonly client: RepositoryEsClient;
  private readonly _encryptionExtension?: ISavedObjectsEncryptionExtension;
  private readonly _securityExtension?: ISavedObjectsSecurityExtension;
  private readonly _spacesExtension?: ISavedObjectsSpacesExtension;
  private _serializer: SavedObjectsSerializer;
  private _logger: Logger;
  private commonHelper: CommonHelper;
  private encryptionHelper: EncryptionHelper;
  private validationHelper: ValidationHelper;
  private preflightCheckHelper: PreflightCheckHelper;
  private serializerHelper: SerializerHelper;

  private apiExecutionContext: ApiExecutionContext;
  private readonly extensions: SavedObjectsExtensions;
  private readonly helpers: RepositoryHelpers;

  /**
   * A factory function for creating SavedObjectRepository instances.
   *
   * @internalRemarks
   * Tests are located in ./repository_create_repository.test.ts
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

    const missingTypeMappings = includedHiddenTypes.filter((type) => !allTypes.includes(type));
    if (missingTypeMappings.length > 0) {
      throw new Error(
        `Missing mappings for saved objects types: '${missingTypeMappings.join(', ')}'`
      );
    }

    const allowedTypes = [...new Set(visibleTypes.concat(includedHiddenTypes))];

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

    this._migrator = migrator;
    this._mappings = mappings;
    this._registry = typeRegistry;
    this.client = createRepositoryEsClient(client);
    this._allowedTypes = allowedTypes;
    this._serializer = serializer;
    this._logger = logger;
    this.extensions = extensions;
    this._encryptionExtension = extensions.encryptionExtension;
    this._securityExtension = extensions.securityExtension;
    this._spacesExtension = extensions.spacesExtension;
    this.commonHelper = new CommonHelper({
      spaceExtension: extensions?.spacesExtension,
      defaultIndex: index,
      kibanaVersion: migrator.kibanaVersion,
      registry: typeRegistry,
    });
    this.encryptionHelper = new EncryptionHelper({
      encryptionExtension: extensions?.encryptionExtension,
      securityExtension: extensions?.securityExtension,
    });
    this.validationHelper = new ValidationHelper({
      registry: typeRegistry,
      logger,
      kibanaVersion: migrator.kibanaVersion,
    });
    this.preflightCheckHelper = new PreflightCheckHelper({
      getIndexForType: this.commonHelper.getIndexForType.bind(this.commonHelper),
      createPointInTimeFinder: this.createPointInTimeFinder.bind(this),
      serializer,
      registry: typeRegistry,
      client: this.client,
    });
    this.serializerHelper = new SerializerHelper({
      registry: typeRegistry,
      serializer,
    });
    this.helpers = {
      common: this.commonHelper,
      preflight: this.preflightCheckHelper,
      validation: this.validationHelper,
      encryption: this.encryptionHelper,
      serializer: this.serializerHelper,
    };
    this.apiExecutionContext = {
      client: this.client,
      extensions: this.extensions,
      helpers: this.helpers,
      allowedTypes: this._allowedTypes,
      registry: this._registry,
      serializer: this._serializer,
      migrator: this._migrator,
      mappings: this._mappings,
      logger: this._logger,
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
    const namespace = this.getCurrentNamespace(options.namespace);
    const { resolved_objects: bulkResults } = await internalBulkResolve<T>({
      registry: this._registry,
      allowedTypes: this._allowedTypes,
      client: this.client,
      serializer: this._serializer,
      getIndexForType: this.getIndexForType.bind(this),
      incrementCounterInternal: this.incrementCounterInternal.bind(this),
      encryptionExtension: this._encryptionExtension,
      securityExtension: this._securityExtension,
      objects,
      options: { ...options, namespace },
    });
    const resolvedObjects = bulkResults.map<SavedObjectsResolveResponse<T>>((result) => {
      // extract payloads from saved object errors
      if (isBulkResolveError(result)) {
        const errorResult = result as BulkResolveError;
        const { type, id, error } = errorResult;
        return {
          saved_object: { type, id, error: errorContent(error) } as unknown as SavedObject<T>,
          outcome: 'exactMatch',
        };
      }
      return result;
    });
    return { resolved_objects: resolvedObjects };
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
    const namespace = this.getCurrentNamespace(options.namespace);
    const { resolved_objects: bulkResults } = await internalBulkResolve<T>({
      registry: this._registry,
      allowedTypes: this._allowedTypes,
      client: this.client,
      serializer: this._serializer,
      getIndexForType: this.getIndexForType.bind(this),
      incrementCounterInternal: this.incrementCounterInternal.bind(this),
      encryptionExtension: this._encryptionExtension,
      securityExtension: this._securityExtension,
      objects: [{ type, id }],
      options: { ...options, namespace },
    });
    const [result] = bulkResults;
    if (isBulkResolveError(result)) {
      throw result.error;
    }
    return result;
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
    const namespace = this.getCurrentNamespace(options.namespace);

    if (!this._allowedTypes.includes(type)) {
      throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
    }
    if (!id) {
      throw SavedObjectsErrorHelpers.createBadRequestError('id cannot be empty'); // prevent potentially upserting a saved object with an empty ID
    }

    const {
      version,
      references,
      upsert,
      refresh = DEFAULT_REFRESH_SETTING,
      retryOnConflict = version ? 0 : DEFAULT_RETRY_COUNT,
    } = options;

    let preflightResult: PreflightCheckNamespacesResult | undefined;
    if (this._registry.isMultiNamespace(type)) {
      preflightResult = await this.preflightCheckHelper.preflightCheckNamespaces({
        type,
        id,
        namespace,
      });
    }

    const existingNamespaces = preflightResult?.savedObjectNamespaces ?? [];

    const authorizationResult = await this._securityExtension?.authorizeUpdate({
      namespace,
      object: { type, id, existingNamespaces },
    });

    if (
      preflightResult?.checkResult === 'found_outside_namespace' ||
      (!upsert && preflightResult?.checkResult === 'not_found')
    ) {
      throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
    }
    if (upsert && preflightResult?.checkResult === 'not_found') {
      // If an upsert would result in the creation of a new object, we need to check for alias conflicts too.
      // This takes an extra round trip to Elasticsearch, but this won't happen often.
      // TODO: improve performance by combining these into a single preflight check
      await this.preflightCheckHelper.preflightCheckForUpsertAliasConflict(type, id, namespace);
    }
    const time = getCurrentTime();

    let rawUpsert: SavedObjectsRawDoc | undefined;
    // don't include upsert if the object already exists; ES doesn't allow upsert in combination with version properties
    if (upsert && (!preflightResult || preflightResult.checkResult === 'not_found')) {
      let savedObjectNamespace: string | undefined;
      let savedObjectNamespaces: string[] | undefined;

      if (this._registry.isSingleNamespace(type) && namespace) {
        savedObjectNamespace = namespace;
      } else if (this._registry.isMultiNamespace(type)) {
        savedObjectNamespaces = preflightResult!.savedObjectNamespaces;
      }

      const migrated = this._migrator.migrateDocument({
        id,
        type,
        ...(savedObjectNamespace && { namespace: savedObjectNamespace }),
        ...(savedObjectNamespaces && { namespaces: savedObjectNamespaces }),
        attributes: {
          ...(await this.encryptionHelper.optionallyEncryptAttributes(type, id, namespace, upsert)),
        },
        updated_at: time,
      });
      rawUpsert = this._serializer.savedObjectToRaw(migrated as SavedObjectSanitizedDoc);
    }

    const doc = {
      [type]: await this.encryptionHelper.optionallyEncryptAttributes(
        type,
        id,
        namespace,
        attributes
      ),
      updated_at: time,
      ...(Array.isArray(references) && { references }),
    };

    const body = await this.client
      .update<unknown, unknown, SavedObjectsRawDocSource>({
        id: this._serializer.generateRawId(namespace, type, id),
        index: this.getIndexForType(type),
        ...getExpectedVersionProperties(version),
        refresh,
        retry_on_conflict: retryOnConflict,
        body: {
          doc,
          ...(rawUpsert && { upsert: rawUpsert._source }),
        },
        _source_includes: ['namespace', 'namespaces', 'originId'],
        require_alias: true,
      })
      .catch((err) => {
        if (SavedObjectsErrorHelpers.isEsUnavailableError(err)) {
          throw err;
        }
        if (SavedObjectsErrorHelpers.isNotFoundError(err)) {
          // see "404s from missing index" above
          throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
        }
        throw err;
      });

    const { originId } = body.get?._source ?? {};
    let namespaces: string[] = [];
    if (!this._registry.isNamespaceAgnostic(type)) {
      namespaces = body.get?._source.namespaces ?? [
        SavedObjectsUtils.namespaceIdToString(body.get?._source.namespace),
      ];
    }

    const result = {
      id,
      type,
      updated_at: time,
      version: encodeHitVersion(body),
      namespaces,
      ...(originId && { originId }),
      references,
      attributes,
    } as SavedObject<T>;

    return this.encryptionHelper.optionallyDecryptAndRedactSingleResult(
      result,
      authorizationResult?.typeMap,
      attributes
    );
  }

  /**
   * {@inheritDoc ISavedObjectsRepository.collectMultiNamespaceReferences}
   */
  async collectMultiNamespaceReferences(
    objects: SavedObjectsCollectMultiNamespaceReferencesObject[],
    options: SavedObjectsCollectMultiNamespaceReferencesOptions = {}
  ) {
    const namespace = this.getCurrentNamespace(options.namespace);
    return collectMultiNamespaceReferences({
      registry: this._registry,
      allowedTypes: this._allowedTypes,
      client: this.client,
      serializer: this._serializer,
      getIndexForType: this.getIndexForType.bind(this),
      createPointInTimeFinder: this.createPointInTimeFinder.bind(this),
      securityExtension: this._securityExtension,
      objects,
      options: { ...options, namespace },
    });
  }

  /**
   * {@inheritDoc ISavedObjectsRepository.updateObjectsSpaces}
   */
  async updateObjectsSpaces(
    objects: SavedObjectsUpdateObjectsSpacesObject[],
    spacesToAdd: string[],
    spacesToRemove: string[],
    options: SavedObjectsUpdateObjectsSpacesOptions = {}
  ) {
    const namespace = this.getCurrentNamespace(options.namespace);
    return updateObjectsSpaces({
      mappings: this._mappings,
      registry: this._registry,
      allowedTypes: this._allowedTypes,
      client: this.client,
      serializer: this._serializer,
      logger: this._logger,
      getIndexForType: this.getIndexForType.bind(this),
      securityExtension: this._securityExtension,
      objects,
      spacesToAdd,
      spacesToRemove,
      options: { ...options, namespace },
    });
  }

  /**
   * {@inheritDoc ISavedObjectsRepository.bulkUpdate}
   */
  async bulkUpdate<T = unknown>(
    objects: Array<SavedObjectsBulkUpdateObject<T>>,
    options: SavedObjectsBulkUpdateOptions = {}
  ): Promise<SavedObjectsBulkUpdateResponse<T>> {
    const namespace = this.getCurrentNamespace(options.namespace);
    const time = getCurrentTime();

    let bulkGetRequestIndexCounter = 0;
    type DocumentToSave = Record<string, unknown>;
    type ExpectedBulkGetResult = Either<
      { type: string; id: string; error: Payload },
      {
        type: string;
        id: string;
        version?: string;
        documentToSave: DocumentToSave;
        objectNamespace?: string;
        esRequestIndex?: number;
      }
    >;
    const expectedBulkGetResults = objects.map<ExpectedBulkGetResult>((object) => {
      const { type, id, attributes, references, version, namespace: objectNamespace } = object;
      let error: DecoratedError | undefined;
      if (!this._allowedTypes.includes(type)) {
        error = SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
      } else {
        try {
          if (objectNamespace === ALL_NAMESPACES_STRING) {
            error = SavedObjectsErrorHelpers.createBadRequestError('"namespace" cannot be "*"');
          }
        } catch (e) {
          error = e;
        }
      }

      if (error) {
        return {
          tag: 'Left',
          value: { id, type, error: errorContent(error) },
        };
      }

      const documentToSave = {
        [type]: attributes,
        updated_at: time,
        ...(Array.isArray(references) && { references }),
      };

      const requiresNamespacesCheck = this._registry.isMultiNamespace(object.type);

      return {
        tag: 'Right',
        value: {
          type,
          id,
          version,
          documentToSave,
          objectNamespace,
          ...(requiresNamespacesCheck && { esRequestIndex: bulkGetRequestIndexCounter++ }),
        },
      };
    });

    const validObjects = expectedBulkGetResults.filter(isRight);
    if (validObjects.length === 0) {
      // We only have error results; return early to avoid potentially trying authZ checks for 0 types which would result in an exception.
      return {
        // Technically the returned array should only contain SavedObject results, but for errors this is not true (we cast to 'any' below)
        saved_objects: expectedBulkGetResults.map<SavedObject<T>>(
          ({ value }) => value as unknown as SavedObject<T>
        ),
      };
    }

    // `objectNamespace` is a namespace string, while `namespace` is a namespace ID.
    // The object namespace string, if defined, will supersede the operation's namespace ID.
    const namespaceString = SavedObjectsUtils.namespaceIdToString(namespace);
    const getNamespaceId = (objectNamespace?: string) =>
      objectNamespace !== undefined
        ? SavedObjectsUtils.namespaceStringToId(objectNamespace)
        : namespace;
    const getNamespaceString = (objectNamespace?: string) => objectNamespace ?? namespaceString;
    const bulkGetDocs = validObjects
      .filter(({ value }) => value.esRequestIndex !== undefined)
      .map(({ value: { type, id, objectNamespace } }) => ({
        _id: this._serializer.generateRawId(getNamespaceId(objectNamespace), type, id),
        _index: this.getIndexForType(type),
        _source: ['type', 'namespaces'],
      }));
    const bulkGetResponse = bulkGetDocs.length
      ? await this.client.mget({ body: { docs: bulkGetDocs } }, { ignore: [404], meta: true })
      : undefined;
    // fail fast if we can't verify a 404 response is from Elasticsearch
    if (
      bulkGetResponse &&
      isNotFoundFromUnsupportedServer({
        statusCode: bulkGetResponse.statusCode,
        headers: bulkGetResponse.headers,
      })
    ) {
      throw SavedObjectsErrorHelpers.createGenericNotFoundEsUnavailableError();
    }

    const authObjects: AuthorizeUpdateObject[] = validObjects.map((element) => {
      const { type, id, objectNamespace, esRequestIndex: index } = element.value;
      const preflightResult = index !== undefined ? bulkGetResponse?.body.docs[index] : undefined;
      return {
        type,
        id,
        objectNamespace,
        // @ts-expect-error MultiGetHit._source is optional
        existingNamespaces: preflightResult?._source?.namespaces ?? [],
      };
    });

    const authorizationResult = await this._securityExtension?.authorizeBulkUpdate({
      namespace,
      objects: authObjects,
    });

    let bulkUpdateRequestIndexCounter = 0;
    const bulkUpdateParams: object[] = [];
    type ExpectedBulkUpdateResult = Either<
      { type: string; id: string; error: Payload },
      {
        type: string;
        id: string;
        namespaces: string[];
        documentToSave: DocumentToSave;
        esRequestIndex: number;
      }
    >;
    const expectedBulkUpdateResults = await Promise.all(
      expectedBulkGetResults.map<Promise<ExpectedBulkUpdateResult>>(
        async (expectedBulkGetResult) => {
          if (isLeft(expectedBulkGetResult)) {
            return expectedBulkGetResult;
          }

          const { esRequestIndex, id, type, version, documentToSave, objectNamespace } =
            expectedBulkGetResult.value;

          let namespaces;
          let versionProperties;
          if (esRequestIndex !== undefined) {
            const indexFound = bulkGetResponse?.statusCode !== 404;
            const actualResult = indexFound
              ? bulkGetResponse?.body.docs[esRequestIndex]
              : undefined;
            const docFound = indexFound && isMgetDoc(actualResult) && actualResult.found;
            if (
              !docFound ||
              // @ts-expect-error MultiGetHit is incorrectly missing _id, _source
              !this.rawDocExistsInNamespace(actualResult, getNamespaceId(objectNamespace))
            ) {
              return {
                tag: 'Left',
                value: {
                  id,
                  type,
                  error: errorContent(
                    SavedObjectsErrorHelpers.createGenericNotFoundError(type, id)
                  ),
                },
              };
            }
            // @ts-expect-error MultiGetHit is incorrectly missing _id, _source
            namespaces = actualResult!._source.namespaces ?? [
              // @ts-expect-error MultiGetHit is incorrectly missing _id, _source
              SavedObjectsUtils.namespaceIdToString(actualResult!._source.namespace),
            ];
            versionProperties = getExpectedVersionProperties(version);
          } else {
            if (this._registry.isSingleNamespace(type)) {
              // if `objectNamespace` is undefined, fall back to `options.namespace`
              namespaces = [getNamespaceString(objectNamespace)];
            }
            versionProperties = getExpectedVersionProperties(version);
          }

          const expectedResult = {
            type,
            id,
            namespaces,
            esRequestIndex: bulkUpdateRequestIndexCounter++,
            documentToSave: expectedBulkGetResult.value.documentToSave,
          };

          bulkUpdateParams.push(
            {
              update: {
                _id: this._serializer.generateRawId(getNamespaceId(objectNamespace), type, id),
                _index: this.getIndexForType(type),
                ...versionProperties,
              },
            },
            {
              doc: {
                ...documentToSave,
                [type]: await this.encryptionHelper.optionallyEncryptAttributes(
                  type,
                  id,
                  objectNamespace || namespace,
                  documentToSave[type]
                ),
              },
            }
          );

          return { tag: 'Right', value: expectedResult };
        }
      )
    );

    const { refresh = DEFAULT_REFRESH_SETTING } = options;
    const bulkUpdateResponse = bulkUpdateParams.length
      ? await this.client.bulk({
          refresh,
          body: bulkUpdateParams,
          _source_includes: ['originId'],
          require_alias: true,
        })
      : undefined;

    const result = {
      saved_objects: expectedBulkUpdateResults.map((expectedResult) => {
        if (isLeft(expectedResult)) {
          return expectedResult.value as any;
        }

        const { type, id, namespaces, documentToSave, esRequestIndex } = expectedResult.value;
        const response = bulkUpdateResponse?.items[esRequestIndex] ?? {};
        const rawResponse = Object.values(response)[0] as any;

        const error = getBulkOperationError(type, id, rawResponse);
        if (error) {
          return { type, id, error };
        }

        // When a bulk update operation is completed, any fields specified in `_sourceIncludes` will be found in the "get" value of the
        // returned object. We need to retrieve the `originId` if it exists so we can return it to the consumer.
        const { _seq_no: seqNo, _primary_term: primaryTerm, get } = rawResponse;

        // eslint-disable-next-line @typescript-eslint/naming-convention
        const { [type]: attributes, references, updated_at } = documentToSave;

        const { originId } = get._source;
        return {
          id,
          type,
          ...(namespaces && { namespaces }),
          ...(originId && { originId }),
          updated_at,
          version: encodeVersion(seqNo, primaryTerm),
          attributes,
          references,
        };
      }),
    };

    return this.encryptionHelper.optionallyDecryptAndRedactBulkResult(
      result,
      authorizationResult?.typeMap,
      objects
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
    const namespace = this.getCurrentNamespace(options.namespace);
    const { refresh = true } = options;

    await this._securityExtension?.authorizeRemoveReferences({ namespace, object: { type, id } });

    const allTypes = this._registry.getAllTypes().map((t) => t.name);

    // we need to target all SO indices as all types of objects may have references to the given SO.
    const targetIndices = this.getIndicesForTypes(allTypes);

    const { body, statusCode, headers } = await this.client.updateByQuery(
      {
        index: targetIndices,
        refresh,
        body: {
          script: {
            source: `
              if (ctx._source.containsKey('references')) {
                def items_to_remove = [];
                for (item in ctx._source.references) {
                  if ( (item['type'] == params['type']) && (item['id'] == params['id']) ) {
                    items_to_remove.add(item);
                  }
                }
                ctx._source.references.removeAll(items_to_remove);
              }
            `,
            params: {
              type,
              id,
            },
            lang: 'painless',
          },
          conflicts: 'proceed',
          ...getSearchDsl(this._mappings, this._registry, {
            namespaces: namespace ? [namespace] : undefined,
            type: allTypes,
            hasReference: { type, id },
          }),
        },
      },
      { ignore: [404], meta: true }
    );
    // fail fast if we can't verify a 404 is from Elasticsearch
    if (isNotFoundFromUnsupportedServer({ statusCode, headers })) {
      throw SavedObjectsErrorHelpers.createGenericNotFoundEsUnavailableError(type, id);
    }

    if (body.failures?.length) {
      throw SavedObjectsErrorHelpers.createConflictError(
        type,
        id,
        `${body.failures.length} references could not be removed`
      );
    }

    return {
      updated: body.updated!,
    };
  }

  /**
   * {@inheritDoc ISavedObjectsRepository.incrementCounter}
   */
  async incrementCounter<T = unknown>(
    type: string,
    id: string,
    counterFields: Array<string | SavedObjectsIncrementCounterField>,
    options?: SavedObjectsIncrementCounterOptions<T>
  ) {
    // This is not exposed on the SOC, there are no authorization or audit logging checks
    if (typeof type !== 'string') {
      throw new Error('"type" argument must be a string');
    }

    const isArrayOfCounterFields =
      Array.isArray(counterFields) &&
      counterFields.every(
        (field) =>
          typeof field === 'string' || (isObject(field) && typeof field.fieldName === 'string')
      );

    if (!isArrayOfCounterFields) {
      throw new Error(
        '"counterFields" argument must be of type Array<string | { incrementBy?: number; fieldName: string }>'
      );
    }
    if (!this._allowedTypes.includes(type)) {
      throw SavedObjectsErrorHelpers.createUnsupportedTypeError(type);
    }

    return this.incrementCounterInternal<T>(type, id, counterFields, options);
  }

  /** @internal incrementCounter function that is used internally and bypasses validation checks. */
  private async incrementCounterInternal<T = unknown>(
    type: string,
    id: string,
    counterFields: Array<string | SavedObjectsIncrementCounterField>,
    options: SavedObjectsIncrementCounterOptions<T> = {}
  ): Promise<SavedObject<T>> {
    const {
      migrationVersion,
      typeMigrationVersion,
      refresh = DEFAULT_REFRESH_SETTING,
      initialize = false,
      upsertAttributes,
      managed,
    } = options;

    if (!id) {
      throw SavedObjectsErrorHelpers.createBadRequestError('id cannot be empty'); // prevent potentially upserting a saved object with an empty ID
    }

    const normalizedCounterFields = counterFields.map((counterField) => {
      /**
       * no counterField configs provided, instead a field name string was passed.
       * ie `incrementCounter(so_type, id, ['my_field_name'])`
       * Using the default of incrementing by 1
       */
      if (typeof counterField === 'string') {
        return {
          fieldName: counterField,
          incrementBy: initialize ? 0 : 1,
        };
      }

      const { incrementBy = 1, fieldName } = counterField;

      return {
        fieldName,
        incrementBy: initialize ? 0 : incrementBy,
      };
    });
    const namespace = normalizeNamespace(options.namespace);

    const time = getCurrentTime();
    let savedObjectNamespace;
    let savedObjectNamespaces: string[] | undefined;

    if (this._registry.isSingleNamespace(type) && namespace) {
      savedObjectNamespace = namespace;
    } else if (this._registry.isMultiNamespace(type)) {
      // note: this check throws an error if the object is found but does not exist in this namespace
      const preflightResult = await this.preflightCheckHelper.preflightCheckNamespaces({
        type,
        id,
        namespace,
      });
      if (preflightResult.checkResult === 'found_outside_namespace') {
        throw SavedObjectsErrorHelpers.createConflictError(type, id);
      }

      if (preflightResult.checkResult === 'not_found') {
        // If an upsert would result in the creation of a new object, we need to check for alias conflicts too.
        // This takes an extra round trip to Elasticsearch, but this won't happen often.
        // TODO: improve performance by combining these into a single preflight check
        await this.preflightCheckHelper.preflightCheckForUpsertAliasConflict(type, id, namespace);
      }

      savedObjectNamespaces = preflightResult.savedObjectNamespaces;
    }

    // attributes: { [counterFieldName]: incrementBy },
    const migrated = this._migrator.migrateDocument({
      id,
      type,
      ...(savedObjectNamespace && { namespace: savedObjectNamespace }),
      ...(savedObjectNamespaces && { namespaces: savedObjectNamespaces }),
      attributes: {
        ...(upsertAttributes ?? {}),
        ...normalizedCounterFields.reduce((acc, counterField) => {
          const { fieldName, incrementBy } = counterField;
          acc[fieldName] = incrementBy;
          return acc;
        }, {} as Record<string, number>),
      },
      migrationVersion,
      typeMigrationVersion,
      managed,
      updated_at: time,
    });

    const raw = this._serializer.savedObjectToRaw(migrated as SavedObjectSanitizedDoc);

    const body = await this.client.update<unknown, unknown, SavedObjectsRawDocSource>({
      id: raw._id,
      index: this.getIndexForType(type),
      refresh,
      require_alias: true,
      _source: true,
      body: {
        script: {
          source: `
              for (int i = 0; i < params.counterFieldNames.length; i++) {
                def counterFieldName = params.counterFieldNames[i];
                def count = params.counts[i];

                if (ctx._source[params.type][counterFieldName] == null) {
                  ctx._source[params.type][counterFieldName] = count;
                }
                else {
                  ctx._source[params.type][counterFieldName] += count;
                }
              }
              ctx._source.updated_at = params.time;
            `,
          lang: 'painless',
          params: {
            counts: normalizedCounterFields.map(
              (normalizedCounterField) => normalizedCounterField.incrementBy
            ),
            counterFieldNames: normalizedCounterFields.map(
              (normalizedCounterField) => normalizedCounterField.fieldName
            ),
            time,
            type,
          },
        },
        upsert: raw._source,
      },
    });

    const { originId } = body.get?._source ?? {};
    return {
      id,
      type,
      ...(savedObjectNamespaces && { namespaces: savedObjectNamespaces }),
      ...(originId && { originId }),
      updated_at: time,
      references: body.get?._source.references ?? [],
      version: encodeHitVersion(body),
      attributes: body.get?._source[type],
      ...(managed && { managed }),
    };
  }

  /**
   * {@inheritDoc ISavedObjectsRepository.openPointInTimeForType}
   */
  async openPointInTimeForType(
    type: string | string[],
    options: SavedObjectsOpenPointInTimeOptions = {},
    internalOptions: SavedObjectsFindInternalOptions = {}
  ): Promise<SavedObjectsOpenPointInTimeResponse> {
    const { disableExtensions } = internalOptions;
    let namespaces!: string[];
    if (disableExtensions || !this._spacesExtension) {
      namespaces = options.namespaces ?? [DEFAULT_NAMESPACE_STRING];
      // If the consumer specified `namespaces: []`, throw a Bad Request error
      if (namespaces.length === 0)
        throw SavedObjectsErrorHelpers.createBadRequestError(
          'options.namespaces cannot be an empty array'
        );
    }

    const { keepAlive = '5m', preference } = options;
    const types = Array.isArray(type) ? type : [type];
    const allowedTypes = types.filter((t) => this._allowedTypes.includes(t));
    if (allowedTypes.length === 0) {
      throw SavedObjectsErrorHelpers.createGenericNotFoundError();
    }

    if (!disableExtensions && this._spacesExtension) {
      try {
        namespaces = await this._spacesExtension.getSearchableNamespaces(options.namespaces);
      } catch (err) {
        if (Boom.isBoom(err) && err.output.payload.statusCode === 403) {
          // The user is not authorized to access any space, throw a bad request error.
          throw SavedObjectsErrorHelpers.createBadRequestError();
        }
        throw err;
      }
      if (namespaces.length === 0) {
        // The user is authorized to access *at least one space*, but not any of the spaces they requested; throw a bad request error.
        throw SavedObjectsErrorHelpers.createBadRequestError();
      }
    }

    if (!disableExtensions && this._securityExtension) {
      await this._securityExtension.authorizeOpenPointInTime({
        namespaces: new Set(namespaces),
        types: new Set(types),
      });
    }

    const esOptions = {
      index: this.getIndicesForTypes(allowedTypes),
      keep_alive: keepAlive,
      ...(preference ? { preference } : {}),
    };

    const { body, statusCode, headers } = await this.client.openPointInTime(esOptions, {
      ignore: [404],
      meta: true,
    });

    if (statusCode === 404) {
      if (!isSupportedEsServer(headers)) {
        throw SavedObjectsErrorHelpers.createGenericNotFoundEsUnavailableError();
      } else {
        throw SavedObjectsErrorHelpers.createGenericNotFoundError();
      }
    }

    return {
      id: body.id,
    };
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

    if (!disableExtensions && this._securityExtension) {
      this._securityExtension.auditClosePointInTime();
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
      logger: this._logger,
      client: this,
      ...dependencies,
      internalOptions,
    });
  }

  /**
   * {@inheritDoc ISavedObjectsRepository.getCurrentNamespace}
   */
  getCurrentNamespace(namespace?: string) {
    return this.commonHelper.getCurrentNamespace(namespace);
  }

  private getIndexForType(type: string) {
    return this.commonHelper.getIndexForType(type);
  }

  private getIndicesForTypes(types: string[]) {
    return this.commonHelper.getIndicesForTypes(types);
  }

  private rawDocExistsInNamespace(raw: SavedObjectsRawDoc, namespace: string | undefined) {
    return rawDocExistsInNamespace(this._registry, raw, namespace);
  }
}
