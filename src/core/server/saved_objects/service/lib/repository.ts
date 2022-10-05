/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { omit, isObject } from 'lodash';
import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import * as esKuery from '@kbn/es-query';
import type { Logger } from '@kbn/logging';
import Boom from '@hapi/boom';
import type { ElasticsearchClient } from '../../../elasticsearch';
import { isSupportedEsServer, isNotFoundFromUnsupportedServer } from '../../../elasticsearch';
import { getRootPropertiesObjects, IndexMapping } from '../../mappings';
import {
  ISavedObjectsPointInTimeFinder,
  PointInTimeFinder,
  SavedObjectsCreatePointInTimeFinderOptions,
  SavedObjectsCreatePointInTimeFinderDependencies,
} from './point_in_time_finder';
import { createRepositoryEsClient, RepositoryEsClient } from './repository_es_client';
import { getSearchDsl } from './search_dsl';
import { includedFields } from './included_fields';
import { SavedObjectsErrorHelpers, DecoratedError } from './errors';
import { decodeRequestVersion, encodeVersion, encodeHitVersion } from '../../version';
import { IKibanaMigrator } from '../../migrations';
import {
  SavedObjectsSerializer,
  SavedObjectSanitizedDoc,
  SavedObjectsRawDoc,
  SavedObjectsRawDocSource,
} from '../../serialization';
import {
  SavedObjectsBulkCreateObject,
  SavedObjectsBulkGetObject,
  SavedObjectsBulkResponse,
  SavedObjectsBulkUpdateResponse,
  SavedObjectsCheckConflictsObject,
  SavedObjectsCheckConflictsResponse,
  SavedObjectsCreateOptions,
  SavedObjectsFindResponse,
  SavedObjectsFindResult,
  SavedObjectsClosePointInTimeOptions,
  SavedObjectsClosePointInTimeResponse,
  SavedObjectsOpenPointInTimeOptions,
  SavedObjectsOpenPointInTimeResponse,
  SavedObjectsUpdateOptions,
  SavedObjectsUpdateResponse,
  SavedObjectsBulkUpdateObject,
  SavedObjectsBulkUpdateOptions,
  SavedObjectsDeleteOptions,
  SavedObjectsRemoveReferencesToOptions,
  SavedObjectsRemoveReferencesToResponse,
  SavedObjectsResolveResponse,
  SavedObjectsBulkResolveObject,
  SavedObjectsBulkResolveResponse,
} from '../saved_objects_client';
import { LEGACY_URL_ALIAS_TYPE } from '../../object_types';
import {
  SavedObject,
  SavedObjectsBaseOptions,
  SavedObjectsFindOptions,
  SavedObjectsMigrationVersion,
  MutatingOperationRefreshSetting,
} from '../../types';
import { SavedObjectsTypeValidator } from '../../validation';
import { ISavedObjectTypeRegistry } from '../../saved_objects_type_registry';
import type { InternalBulkResolveError } from './internal_bulk_resolve';
import { internalBulkResolve, isBulkResolveError } from './internal_bulk_resolve';
import { validateConvertFilterToKueryNode } from './filter_utils';
import { validateAndConvertAggregations } from './aggregations';
import {
  getBulkOperationError,
  getCurrentTime,
  getExpectedVersionProperties,
  getSavedObjectFromSource,
  normalizeNamespace,
  rawDocExistsInNamespace,
  rawDocExistsInNamespaces,
  Either,
  isLeft,
  isRight,
} from './internal_utils';
import {
  ALL_NAMESPACES_STRING,
  DEFAULT_NAMESPACE_STRING,
  FIND_DEFAULT_PAGE,
  FIND_DEFAULT_PER_PAGE,
  SavedObjectsUtils,
} from './utils';
import {
  collectMultiNamespaceReferences,
  SavedObjectsCollectMultiNamespaceReferencesObject,
  SavedObjectsCollectMultiNamespaceReferencesOptions,
} from './collect_multi_namespace_references';
import {
  updateObjectsSpaces,
  SavedObjectsUpdateObjectsSpacesObject,
  SavedObjectsUpdateObjectsSpacesOptions,
} from './update_objects_spaces';
import { getIndexForType } from './get_index_for_type';
import {
  preflightCheckForCreate,
  PreflightCheckForCreateObject,
  PreflightCheckForCreateResult,
} from './preflight_check_for_create';
import { deleteLegacyUrlAliases } from './legacy_url_aliases';
import {
  AuditAction,
  AuthorizationTypeMap,
  CheckAuthorizationResult,
  ISavedObjectsEncryptionExtension,
  ISavedObjectsSecurityExtension,
  ISavedObjectsSpacesExtension,
  SavedObjectsExtensions,
} from './extensions';

// BEWARE: The SavedObjectClient depends on the implementation details of the SavedObjectsRepository
// so any breaking changes to this repository are considered breaking changes to the SavedObjectsClient.

export interface SavedObjectsRepositoryOptions {
  index: string;
  mappings: IndexMapping;
  client: ElasticsearchClient;
  typeRegistry: ISavedObjectTypeRegistry;
  serializer: SavedObjectsSerializer;
  migrator: IKibanaMigrator;
  allowedTypes: string[];
  logger: Logger;
  extensions: SavedObjectsExtensions | undefined;
}

/**
 * @public
 */
export interface SavedObjectsIncrementCounterOptions<Attributes = unknown>
  extends SavedObjectsBaseOptions {
  /**
   * (default=false) If true, sets all the counter fields to 0 if they don't
   * already exist. Existing fields will be left as-is and won't be incremented.
   */
  initialize?: boolean;
  /** {@link SavedObjectsMigrationVersion} */
  migrationVersion?: SavedObjectsMigrationVersion;
  /**
   * (default='wait_for') The Elasticsearch refresh setting for this
   * operation. See {@link MutatingOperationRefreshSetting}
   */
  refresh?: MutatingOperationRefreshSetting;
  /**
   * Attributes to use when upserting the document if it doesn't exist.
   */
  upsertAttributes?: Attributes;
}

/**
 *
 * @public
 */
export interface SavedObjectsDeleteByNamespaceOptions extends SavedObjectsBaseOptions {
  /** The Elasticsearch supports only boolean flag for this operation */
  refresh?: boolean;
}

export const DEFAULT_REFRESH_SETTING = 'wait_for';
export const DEFAULT_RETRY_COUNT = 3;

/**
 * See {@link SavedObjectsRepository}
 *
 * @public
 */
export type ISavedObjectsRepository = Pick<SavedObjectsRepository, keyof SavedObjectsRepository>;

/**
 * @public
 */
export interface SavedObjectsIncrementCounterField {
  /** The field name to increment the counter by.*/
  fieldName: string;
  /** The number to increment the field by (defaults to 1).*/
  incrementBy?: number;
}

/**
 * @internal
 */
export interface SavedObjectsFindInternalOptions {
  /** This is used for calls internal to the SO doamain that need to use a PIT finder but want to prevent extensions from functioning.
   * We use the SOR's PointInTimeFinder internally when searching for aliases and shared origins for saved objects, but we
   * need to disable the extensions for that to function correctly.
   * Before, when we had SOC wrappers, the SOR's PointInTimeFinder did not have any of the wrapper functionality applied.
   * This disableExtensions internal option preserves that behavior.
   */
  disableExtensions?: boolean;
}

/**
 * @internal
 */
interface PreflightCheckNamespacesParams {
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
interface PreflightCheckNamespacesResult {
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

function isMgetDoc(doc?: estypes.MgetResponseItem<unknown>): doc is estypes.GetGetResult {
  return Boolean(doc && 'found' in doc);
}

/**
 * @public
 */
export class SavedObjectsRepository {
  private _migrator: IKibanaMigrator;
  private _index: string;
  private _mappings: IndexMapping;
  private _registry: ISavedObjectTypeRegistry;
  private _allowedTypes: string[];
  private readonly client: RepositoryEsClient;
  private readonly _encryptionExtension: ISavedObjectsEncryptionExtension | undefined;
  private readonly _securityExtension: ISavedObjectsSecurityExtension | undefined;
  private readonly _spacesExtension: ISavedObjectsSpacesExtension | undefined;
  private _serializer: SavedObjectsSerializer;
  private _logger: Logger;

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
      extensions,
    } = options;

    // It's important that we migrate documents / mark them as up-to-date
    // prior to writing them to the index. Otherwise, we'll cause unnecessary
    // index migrations to run at Kibana startup, and those will probably fail
    // due to invalidly versioned documents in the index.
    //
    // The migrator performs double-duty, and validates the documents prior
    // to returning them.
    this._migrator = migrator;
    this._index = index;
    this._mappings = mappings;
    this._registry = typeRegistry;
    this.client = createRepositoryEsClient(client);
    if (allowedTypes.length === 0) {
      throw new Error('Empty or missing types for saved object repository!');
    }
    this._allowedTypes = allowedTypes;
    this._serializer = serializer;
    this._logger = logger;
    this._encryptionExtension = extensions?.encryptionExtension;
    this._securityExtension = extensions?.securityExtension;
    this._spacesExtension = extensions?.spacesExtension;
  }

  /**
   * Persists an object
   *
   * @param {string} type
   * @param {object} attributes
   * @param {object} [options={}]
   * @property {string} [options.id] - force id on creation, not recommended
   * @property {boolean} [options.overwrite=false]
   * @property {object} [options.migrationVersion=undefined]
   * @property {string} [options.namespace]
   * @property {array} [options.references=[]] - [{ name, type, id }]
   * @returns {promise} - { id, type, version, attributes }
   */
  public async create<T = unknown>(
    type: string,
    attributes: T,
    options: SavedObjectsCreateOptions = {}
  ): Promise<SavedObject<T>> {
    const namespace = this.getCurrentNamespace(options.namespace);
    const {
      migrationVersion,
      coreMigrationVersion,
      overwrite = false,
      references = [],
      refresh = DEFAULT_REFRESH_SETTING,
      initialNamespaces,
      version,
    } = options;
    if (!this._allowedTypes.includes(type)) {
      throw SavedObjectsErrorHelpers.createUnsupportedTypeError(type);
    }
    const id = this.getValidId(type, options.id, options.version, options.overwrite);
    this.validateInitialNamespaces(type, initialNamespaces);
    this.validateOriginId(type, options);

    const time = getCurrentTime();
    let savedObjectNamespace: string | undefined;
    let savedObjectNamespaces: string[] | undefined;
    let existingOriginId: string | undefined;
    const namespaceString = SavedObjectsUtils.namespaceIdToString(namespace);

    let preflightResult: PreflightCheckForCreateResult | undefined;
    if (this._registry.isSingleNamespace(type)) {
      savedObjectNamespace = initialNamespaces
        ? normalizeNamespace(initialNamespaces[0])
        : namespace;
    } else if (this._registry.isMultiNamespace(type)) {
      if (options.id) {
        // we will overwrite a multi-namespace saved object if it exists; if that happens, ensure we preserve its included namespaces
        // note: this check throws an error if the object is found but does not exist in this namespace
        preflightResult = (
          await preflightCheckForCreate({
            registry: this._registry,
            client: this.client,
            serializer: this._serializer,
            getIndexForType: this.getIndexForType.bind(this),
            createPointInTimeFinder: this.createPointInTimeFinder.bind(this),
            objects: [{ type, id, overwrite, namespaces: initialNamespaces ?? [namespaceString] }],
          })
        )[0];
      }
      savedObjectNamespaces =
        initialNamespaces || getSavedObjectNamespaces(namespace, preflightResult?.existingDocument);
      existingOriginId = preflightResult?.existingDocument?._source?.originId;
    }

    const spacesToEnforce = new Set(initialNamespaces).add(namespaceString); // Always check/enforce authZ for the active space
    const existingNamespaces = preflightResult?.existingDocument?._source?.namespaces || [];
    const spacesToAuthorize = new Set(existingNamespaces);
    spacesToAuthorize.delete(ALL_NAMESPACES_STRING); // Don't accidentally check for global privileges when the object exists in '*'
    const authorizationResult = await this._securityExtension?.checkAuthorization({
      types: new Set([type]),
      spaces: new Set([...spacesToEnforce, ...spacesToAuthorize]), // existing namespaces are included so we can later redact if necessary
      actions: ['create'],
      // If a user tries to create an object with `initialNamespaces: ['*']`, they need to have 'create' privileges for the Global Resource
      // (e.g., All privileges for All Spaces).
      // Inversely, if a user tries to overwrite an object that already exists in '*', they don't need to 'create' privileges for the Global
      // Resource, so in that case we have to filter out that string from spacesToAuthorize (because `allowGlobalResource: true` is used
      // below.)
      options: { allowGlobalResource: true },
    });
    if (authorizationResult) {
      this._securityExtension!.enforceAuthorization({
        typesAndSpaces: new Map([[type, spacesToEnforce]]),
        action: 'create',
        typeMap: authorizationResult.typeMap,
        auditCallback: (error) =>
          this._securityExtension!.addAuditEvent({
            action: AuditAction.CREATE,
            savedObject: { type, id },
            error,
            ...(!error && { outcome: 'unknown' }), // If authorization was a success, the outcome is unknown because the create operation has not occurred yet
          }),
      });
    }

    if (preflightResult?.error) {
      // This intentionally occurs _after_ the authZ enforcement (which may throw a 403 error earlier)
      throw SavedObjectsErrorHelpers.createConflictError(type, id);
    }

    // 1. If the originId has been *explicitly set* in the options (defined or undefined), respect that.
    // 2. Otherwise, preserve the originId of the existing object that is being overwritten, if any.
    const originId = Object.keys(options).includes('originId')
      ? options.originId
      : existingOriginId;
    const migrated = this._migrator.migrateDocument({
      id,
      type,
      ...(savedObjectNamespace && { namespace: savedObjectNamespace }),
      ...(savedObjectNamespaces && { namespaces: savedObjectNamespaces }),
      originId,
      attributes: await this.optionallyEncryptAttributes(
        type,
        id,
        savedObjectNamespace, // if single namespace type, this is the first in initialNamespaces. If multi-namespace type this is options.namespace/current namespace.
        attributes
      ),
      migrationVersion,
      coreMigrationVersion,
      updated_at: time,
      ...(Array.isArray(references) && { references }),
    });

    /**
     * If a validation has been registered for this type, we run it against the migrated attributes.
     * This is an imperfect solution because malformed attributes could have already caused the
     * migration to fail, but it's the best we can do without devising a way to run validations
     * inside the migration algorithm itself.
     */
    this.validateObjectAttributes(type, migrated as SavedObjectSanitizedDoc<T>);

    const raw = this._serializer.savedObjectToRaw(migrated as SavedObjectSanitizedDoc<T>);

    const requestParams = {
      id: raw._id,
      index: this.getIndexForType(type),
      refresh,
      body: raw._source,
      ...(overwrite && version ? decodeRequestVersion(version) : {}),
      require_alias: true,
    };

    const { body, statusCode, headers } =
      id && overwrite
        ? await this.client.index(requestParams, { meta: true })
        : await this.client.create(requestParams, { meta: true });

    // throw if we can't verify a 404 response is from Elasticsearch
    if (isNotFoundFromUnsupportedServer({ statusCode, headers })) {
      throw SavedObjectsErrorHelpers.createGenericNotFoundEsUnavailableError(id, type);
    }

    return this.optionallyDecryptAndRedactSingleResult(
      this._rawToSavedObject<T>({ ...raw, ...body }),
      authorizationResult?.typeMap,
      attributes
    );
  }

  /**
   * Creates multiple documents at once
   *
   * @param {array} objects - [{ type, id, attributes, references, migrationVersion }]
   * @param {object} [options={}]
   * @property {boolean} [options.overwrite=false] - overwrites existing documents
   * @property {string} [options.namespace]
   * @returns {promise} -  {saved_objects: [[{ id, type, version, references, attributes, error: { message } }]}
   */
  async bulkCreate<T = unknown>(
    objects: Array<SavedObjectsBulkCreateObject<T>>,
    options: SavedObjectsCreateOptions = {}
  ): Promise<SavedObjectsBulkResponse<T>> {
    const namespace = this.getCurrentNamespace(options.namespace);
    const { overwrite = false, refresh = DEFAULT_REFRESH_SETTING } = options;
    const time = getCurrentTime();

    let preflightCheckIndexCounter = 0;
    type ExpectedResult = Either<
      { type: string; id?: string; error: Payload },
      {
        method: 'index' | 'create';
        object: SavedObjectsBulkCreateObject & { id: string };
        preflightCheckIndex?: number;
      }
    >;
    const expectedResults = objects.map<ExpectedResult>((object) => {
      const { type, id: requestId, initialNamespaces, version } = object;
      let error: DecoratedError | undefined;
      let id: string = ''; // Assign to make TS happy, the ID will be validated (or randomly generated if needed) during getValidId below
      if (!this._allowedTypes.includes(type)) {
        error = SavedObjectsErrorHelpers.createUnsupportedTypeError(type);
      } else {
        try {
          id = this.getValidId(type, requestId, version, overwrite);
          this.validateInitialNamespaces(type, initialNamespaces);
          this.validateOriginId(type, object);
        } catch (e) {
          error = e;
        }
      }

      if (error) {
        return {
          tag: 'Left',
          value: { id: requestId, type, error: errorContent(error) },
        };
      }

      const method = requestId && overwrite ? 'index' : 'create';
      const requiresNamespacesCheck = requestId && this._registry.isMultiNamespace(type);

      return {
        tag: 'Right',
        value: {
          method,
          object: { ...object, id },
          ...(requiresNamespacesCheck && { preflightCheckIndex: preflightCheckIndexCounter++ }),
        },
      };
    });

    const validObjects = expectedResults.filter(isRight);
    if (validObjects.length === 0) {
      // We only have error results; return early to avoid potentially trying authZ checks for 0 types which would result in an exception.
      return {
        // Technically the returned array should only contain SavedObject results, but for errors this is not true (we cast to 'unknown' below)
        saved_objects: expectedResults.map<SavedObject<T>>(
          ({ value }) => value as unknown as SavedObject<T>
        ),
      };
    }

    const namespaceString = SavedObjectsUtils.namespaceIdToString(namespace);
    const preflightCheckObjects = validObjects
      .filter(({ value }) => value.preflightCheckIndex !== undefined)
      .map<PreflightCheckForCreateObject>(({ value }) => {
        const { type, id, initialNamespaces } = value.object;
        const namespaces = initialNamespaces ?? [namespaceString];
        return { type, id, overwrite, namespaces };
      });
    const preflightCheckResponse = await preflightCheckForCreate({
      registry: this._registry,
      client: this.client,
      serializer: this._serializer,
      getIndexForType: this.getIndexForType.bind(this),
      createPointInTimeFinder: this.createPointInTimeFinder.bind(this),
      objects: preflightCheckObjects,
    });

    const typesAndSpaces = new Map<string, Set<string>>();
    const spacesToAuthorize = new Set<string>([namespaceString]); // Always check authZ for the active space
    for (const { value } of validObjects) {
      const { object, preflightCheckIndex: index } = value;
      const preflightResult = index !== undefined ? preflightCheckResponse[index] : undefined;

      const spacesToEnforce = typesAndSpaces.get(object.type) ?? new Set([namespaceString]); // Always enforce authZ for the active space
      for (const space of object.initialNamespaces ?? []) {
        spacesToEnforce.add(space);
        spacesToAuthorize.add(space);
      }
      typesAndSpaces.set(object.type, spacesToEnforce);
      for (const space of preflightResult?.existingDocument?._source.namespaces ?? []) {
        if (space === ALL_NAMESPACES_STRING) continue; // Don't accidentally check for global privileges when the object exists in '*'
        spacesToAuthorize.add(space); // existing namespaces are included so we can later redact if necessary
      }
    }

    const authorizationResult = await this._securityExtension?.checkAuthorization({
      types: new Set(typesAndSpaces.keys()),
      spaces: spacesToAuthorize,
      actions: ['bulk_create'],
      // If a user tries to create an object with `initialNamespaces: ['*']`, they need to have 'bulk_create' privileges for the Global
      // Resource (e.g., All privileges for All Spaces).
      // Inversely, if a user tries to overwrite an object that already exists in '*', they don't need to have 'bulk_create' privileges for the Global
      // Resource, so in that case we have to filter out that string from spacesToAuthorize (because `allowGlobalResource: true` is used
      // below.)
      options: { allowGlobalResource: true },
    });
    if (authorizationResult) {
      this._securityExtension!.enforceAuthorization({
        typesAndSpaces,
        action: 'bulk_create',
        typeMap: authorizationResult.typeMap,
        auditCallback: (error) => {
          for (const { value } of validObjects) {
            this._securityExtension!.addAuditEvent({
              action: AuditAction.CREATE,
              savedObject: { type: value.object.type, id: value.object.id },
              error,
              ...(!error && { outcome: 'unknown' }), // If authorization was a success, the outcome is unknown because the create operation has not occurred yet
            });
          }
        },
      });
    }

    let bulkRequestIndexCounter = 0;
    const bulkCreateParams: object[] = [];
    type ExpectedBulkResult = Either<
      { type: string; id?: string; error: Payload },
      { esRequestIndex: number; requestedId: string; rawMigratedDoc: SavedObjectsRawDoc }
    >;
    const expectedBulkResults = await Promise.all(
      expectedResults.map<Promise<ExpectedBulkResult>>(async (expectedBulkGetResult) => {
        if (isLeft(expectedBulkGetResult)) {
          return expectedBulkGetResult;
        }

        let savedObjectNamespace: string | undefined;
        let savedObjectNamespaces: string[] | undefined;
        let existingOriginId: string | undefined;
        let versionProperties;
        const {
          preflightCheckIndex,
          object: { initialNamespaces, version, ...object },
          method,
        } = expectedBulkGetResult.value;
        if (preflightCheckIndex !== undefined) {
          const preflightResult = preflightCheckResponse[preflightCheckIndex];
          const { type, id, existingDocument, error } = preflightResult;
          if (error) {
            const { metadata } = error;
            return {
              tag: 'Left',
              value: {
                id,
                type,
                error: {
                  ...errorContent(SavedObjectsErrorHelpers.createConflictError(type, id)),
                  ...(metadata && { metadata }),
                },
              },
            };
          }
          savedObjectNamespaces =
            initialNamespaces || getSavedObjectNamespaces(namespace, existingDocument);
          versionProperties = getExpectedVersionProperties(version);
          existingOriginId = existingDocument?._source?.originId;
        } else {
          if (this._registry.isSingleNamespace(object.type)) {
            savedObjectNamespace = initialNamespaces
              ? normalizeNamespace(initialNamespaces[0])
              : namespace;
          } else if (this._registry.isMultiNamespace(object.type)) {
            savedObjectNamespaces = initialNamespaces || getSavedObjectNamespaces(namespace);
          }
          versionProperties = getExpectedVersionProperties(version);
        }

        // 1. If the originId has been *explicitly set* in the options (defined or undefined), respect that.
        // 2. Otherwise, preserve the originId of the existing object that is being overwritten, if any.
        const originId = Object.keys(object).includes('originId')
          ? object.originId
          : existingOriginId;
        const migrated = this._migrator.migrateDocument({
          id: object.id,
          type: object.type,
          attributes: await this.optionallyEncryptAttributes(
            object.type,
            object.id,
            savedObjectNamespace, // only used for multi-namespace object types
            object.attributes
          ),
          migrationVersion: object.migrationVersion,
          coreMigrationVersion: object.coreMigrationVersion,
          ...(savedObjectNamespace && { namespace: savedObjectNamespace }),
          ...(savedObjectNamespaces && { namespaces: savedObjectNamespaces }),
          updated_at: time,
          references: object.references || [],
          originId,
        }) as SavedObjectSanitizedDoc<T>;

        /**
         * If a validation has been registered for this type, we run it against the migrated attributes.
         * This is an imperfect solution because malformed attributes could have already caused the
         * migration to fail, but it's the best we can do without devising a way to run validations
         * inside the migration algorithm itself.
         */
        try {
          this.validateObjectAttributes(object.type, migrated);
        } catch (error) {
          return {
            tag: 'Left',
            value: {
              id: object.id,
              type: object.type,
              error,
            },
          };
        }

        const expectedResult = {
          esRequestIndex: bulkRequestIndexCounter++,
          requestedId: object.id,
          rawMigratedDoc: this._serializer.savedObjectToRaw(migrated),
        };

        bulkCreateParams.push(
          {
            [method]: {
              _id: expectedResult.rawMigratedDoc._id,
              _index: this.getIndexForType(object.type),
              ...(overwrite && versionProperties),
            },
          },
          expectedResult.rawMigratedDoc._source
        );

        return { tag: 'Right', value: expectedResult };
      })
    );

    const bulkResponse = bulkCreateParams.length
      ? await this.client.bulk({
          refresh,
          require_alias: true,
          body: bulkCreateParams,
        })
      : undefined;

    const result = {
      saved_objects: expectedBulkResults.map((expectedResult) => {
        if (isLeft(expectedResult)) {
          return expectedResult.value as any;
        }

        const { requestedId, rawMigratedDoc, esRequestIndex } = expectedResult.value;
        const rawResponse = Object.values(bulkResponse?.items[esRequestIndex] ?? {})[0] as any;

        const error = getBulkOperationError(rawMigratedDoc._source.type, requestedId, rawResponse);
        if (error) {
          return { type: rawMigratedDoc._source.type, id: requestedId, error };
        }

        // When method == 'index' the bulkResponse doesn't include the indexed
        // _source so we return rawMigratedDoc but have to spread the latest
        // _seq_no and _primary_term values from the rawResponse.
        return this._rawToSavedObject({
          ...rawMigratedDoc,
          ...{ _seq_no: rawResponse._seq_no, _primary_term: rawResponse._primary_term },
        });
      }),
    };

    return this.optionallyDecryptAndRedactBulkResult(result, authorizationResult?.typeMap, objects);
  }

  /**
   * Check what conflicts will result when creating a given array of saved objects. This includes "unresolvable conflicts", which are
   * multi-namespace objects that exist in a different namespace; such conflicts cannot be resolved/overwritten.
   */
  async checkConflicts(
    objects: SavedObjectsCheckConflictsObject[] = [],
    options: SavedObjectsBaseOptions = {}
  ): Promise<SavedObjectsCheckConflictsResponse> {
    const namespace = this.getCurrentNamespace(options.namespace);

    if (objects.length === 0) {
      return { errors: [] };
    }

    let bulkGetRequestIndexCounter = 0;
    type ExpectedBulkGetResult = Either<
      { type: string; id: string; error: Payload },
      { type: string; id: string; esRequestIndex: number }
    >;
    const expectedBulkGetResults = objects.map<ExpectedBulkGetResult>((object) => {
      const { type, id } = object;

      if (!this._allowedTypes.includes(type)) {
        return {
          tag: 'Left',
          value: {
            id,
            type,
            error: errorContent(SavedObjectsErrorHelpers.createUnsupportedTypeError(type)),
          },
        };
      }

      return {
        tag: 'Right',
        value: {
          type,
          id,
          esRequestIndex: bulkGetRequestIndexCounter++,
        },
      };
    });

    const namespaceString = SavedObjectsUtils.namespaceIdToString(namespace);
    const validObjects = expectedBulkGetResults.filter(isRight);
    const typesAndSpaces = new Map<string, Set<string>>();
    for (const { value } of validObjects) {
      typesAndSpaces.set(value.type, new Set([namespaceString])); // Always enforce authZ for the active space
    }
    const authorizationResult = await this._securityExtension?.checkAuthorization({
      types: new Set(typesAndSpaces.keys()),
      spaces: new Set([namespaceString]), // Always check authZ for the active space
      actions: ['bulk_create'],
    });
    if (authorizationResult) {
      this._securityExtension!.enforceAuthorization({
        typesAndSpaces,
        action: 'bulk_create',
        typeMap: authorizationResult.typeMap,
        // auditCallback is intentionally omitted, this function in the previous Security SOC wrapper implementation
        // did not have audit logging. This is primarily because it is only used internally during imports, it is not
        // exposed in a public HTTP API
      });
    }

    const bulkGetDocs = validObjects.map(({ value: { type, id } }) => ({
      _id: this._serializer.generateRawId(namespace, type, id),
      _index: this.getIndexForType(type),
      _source: { includes: ['type', 'namespaces'] },
    }));
    const bulkGetResponse = bulkGetDocs.length
      ? await this.client.mget<SavedObjectsRawDocSource>(
          {
            body: {
              docs: bulkGetDocs,
            },
          },
          { ignore: [404], meta: true }
        )
      : undefined;
    // throw if we can't verify a 404 response is from Elasticsearch
    if (
      bulkGetResponse &&
      isNotFoundFromUnsupportedServer({
        statusCode: bulkGetResponse.statusCode,
        headers: bulkGetResponse.headers,
      })
    ) {
      throw SavedObjectsErrorHelpers.createGenericNotFoundEsUnavailableError();
    }

    const errors: SavedObjectsCheckConflictsResponse['errors'] = [];
    expectedBulkGetResults.forEach((expectedResult) => {
      if (isLeft(expectedResult)) {
        errors.push(expectedResult.value as any);
        return;
      }

      const { type, id, esRequestIndex } = expectedResult.value;
      const doc = bulkGetResponse?.body.docs[esRequestIndex];
      if (isMgetDoc(doc) && doc.found) {
        errors.push({
          id,
          type,
          error: {
            ...errorContent(SavedObjectsErrorHelpers.createConflictError(type, id)),
            // @ts-expect-error MultiGetHit._source is optional
            ...(!this.rawDocExistsInNamespace(doc!, namespace) && {
              metadata: { isNotOverwritable: true },
            }),
          },
        });
      }
    });

    return { errors };
  }

  /**
   * Deletes an object
   *
   * @param {string} type
   * @param {string} id
   * @param {object} [options={}]
   * @property {string} [options.namespace]
   * @returns {promise}
   */
  async delete(type: string, id: string, options: SavedObjectsDeleteOptions = {}): Promise<{}> {
    const namespace = this.getCurrentNamespace(options.namespace);

    if (!this._allowedTypes.includes(type)) {
      throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
    }

    const { refresh = DEFAULT_REFRESH_SETTING, force } = options;

    const namespaceString = SavedObjectsUtils.namespaceIdToString(namespace);
    const typesAndSpaces = new Map<string, Set<string>>([[type, new Set([namespaceString])]]); // Always enforce authZ for the active space
    const authorizationResult = await this._securityExtension?.checkAuthorization({
      types: new Set([type]),
      spaces: new Set([namespaceString]), // Always check authZ for the active space
      actions: ['delete'],
    });
    if (authorizationResult) {
      this._securityExtension!.enforceAuthorization({
        typesAndSpaces,
        action: 'delete',
        typeMap: authorizationResult.typeMap,
        auditCallback: (error) => {
          this._securityExtension!.addAuditEvent({
            action: AuditAction.DELETE,
            savedObject: { type, id },
            error,
            ...(!error && { outcome: 'unknown' }), // If authorization was a success, the outcome is unknown because the delete operation has not occurred yet
          });
        },
      });
    }

    const rawId = this._serializer.generateRawId(namespace, type, id);
    let preflightResult: PreflightCheckNamespacesResult | undefined;

    if (this._registry.isMultiNamespace(type)) {
      // note: this check throws an error if the object is found but does not exist in this namespace
      preflightResult = await this.preflightCheckNamespaces({
        type,
        id,
        namespace,
      });
      if (
        preflightResult.checkResult === 'found_outside_namespace' ||
        preflightResult.checkResult === 'not_found'
      ) {
        throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
      }
      const existingNamespaces = preflightResult.savedObjectNamespaces ?? [];
      if (
        !force &&
        (existingNamespaces.length > 1 || existingNamespaces.includes(ALL_NAMESPACES_STRING))
      ) {
        throw SavedObjectsErrorHelpers.createBadRequestError(
          'Unable to delete saved object that exists in multiple namespaces, use the `force` option to delete it anyway'
        );
      }
    }

    const { body, statusCode, headers } = await this.client.delete(
      {
        id: rawId,
        index: this.getIndexForType(type),
        ...getExpectedVersionProperties(undefined),
        refresh,
      },
      { ignore: [404], meta: true }
    );

    if (isNotFoundFromUnsupportedServer({ statusCode, headers })) {
      throw SavedObjectsErrorHelpers.createGenericNotFoundEsUnavailableError(type, id);
    }

    const deleted = body.result === 'deleted';
    if (deleted) {
      const namespaces = preflightResult?.savedObjectNamespaces;
      if (namespaces) {
        // This is a multi-namespace object type, and it might have legacy URL aliases that need to be deleted.
        await deleteLegacyUrlAliases({
          mappings: this._mappings,
          registry: this._registry,
          client: this.client,
          getIndexForType: this.getIndexForType.bind(this),
          type,
          id,
          ...(namespaces.includes(ALL_NAMESPACES_STRING)
            ? { namespaces: [], deleteBehavior: 'exclusive' } // delete legacy URL aliases for this type/ID for all spaces
            : { namespaces, deleteBehavior: 'inclusive' }), // delete legacy URL aliases for this type/ID for these specific spaces
        }).catch((err) => {
          // The object has already been deleted, but we caught an error when attempting to delete aliases.
          // A consumer cannot attempt to delete the object again, so just log the error and swallow it.
          this._logger.error(`Unable to delete aliases when deleting an object: ${err.message}`);
        });
      }
      return {};
    }

    const deleteDocNotFound = body.result === 'not_found';
    // @ts-expect-error @elastic/elasticsearch doesn't declare error on DeleteResponse
    const deleteIndexNotFound = body.error && body.error.type === 'index_not_found_exception';
    if (deleteDocNotFound || deleteIndexNotFound) {
      // see "404s from missing index" above
      throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
    }

    throw new Error(
      `Unexpected Elasticsearch DELETE response: ${JSON.stringify({
        type,
        id,
        response: { body, statusCode },
      })}`
    );
  }

  /**
   * Deletes all objects from the provided namespace.
   *
   * @param {string} namespace
   * @returns {promise} - { took, timed_out, total, deleted, batches, version_conflicts, noops, retries, failures }
   */
  async deleteByNamespace(
    namespace: string,
    options: SavedObjectsDeleteByNamespaceOptions = {}
  ): Promise<any> {
    // This is not exposed on the SOC; authorization and audit logging is handled by the Spaces plugin
    if (!namespace || typeof namespace !== 'string' || namespace === '*') {
      throw new TypeError(`namespace is required, and must be a string that is not equal to '*'`);
    }

    const allTypes = Object.keys(getRootPropertiesObjects(this._mappings));
    const typesToUpdate = [
      ...allTypes.filter((type) => !this._registry.isNamespaceAgnostic(type)),
      LEGACY_URL_ALIAS_TYPE,
    ];

    // Construct kueryNode to filter legacy URL aliases (these space-agnostic objects do not use root-level "namespace/s" fields)
    const { buildNode } = esKuery.nodeTypes.function;
    const match1 = buildNode('is', `${LEGACY_URL_ALIAS_TYPE}.targetNamespace`, namespace);
    const match2 = buildNode('not', buildNode('is', 'type', LEGACY_URL_ALIAS_TYPE));
    const kueryNode = buildNode('or', [match1, match2]);

    const { body, statusCode, headers } = await this.client.updateByQuery(
      {
        index: this.getIndicesForTypes(typesToUpdate),
        refresh: options.refresh,
        body: {
          script: {
            source: `
              if (!ctx._source.containsKey('namespaces')) {
                ctx.op = "delete";
              } else {
                ctx._source['namespaces'].removeAll(Collections.singleton(params['namespace']));
                if (ctx._source['namespaces'].empty) {
                  ctx.op = "delete";
                }
              }
            `,
            lang: 'painless',
            params: { namespace },
          },
          conflicts: 'proceed',
          ...getSearchDsl(this._mappings, this._registry, {
            namespaces: [namespace],
            type: typesToUpdate,
            kueryNode,
          }),
        },
      },
      { ignore: [404], meta: true }
    );
    // throw if we can't verify a 404 response is from Elasticsearch
    if (isNotFoundFromUnsupportedServer({ statusCode, headers })) {
      throw SavedObjectsErrorHelpers.createGenericNotFoundEsUnavailableError();
    }

    return body;
  }

  /**
   * @param {object} [options={}]
   * @property {(string|Array<string>)} [options.type]
   * @property {string} [options.search]
   * @property {string} [options.defaultSearchOperator]
   * @property {Array<string>} [options.searchFields] - see Elasticsearch Simple Query String
   *                                        Query field argument for more information
   * @property {integer} [options.page=1]
   * @property {integer} [options.perPage=20]
   * @property {Array<unknown>} [options.searchAfter]
   * @property {string} [options.sortField]
   * @property {string} [options.sortOrder]
   * @property {Array<string>} [options.fields]
   * @property {string} [options.namespace]
   * @property {object} [options.hasReference] - { type, id }
   * @property {string} [options.pit]
   * @property {string} [options.preference]
   * @returns {promise} - { saved_objects: [{ id, type, version, attributes }], total, per_page, page }
   */
  async find<T = unknown, A = unknown>(
    options: SavedObjectsFindOptions,
    internalOptions: SavedObjectsFindInternalOptions = {}
  ): Promise<SavedObjectsFindResponse<T, A>> {
    let namespaces!: string[];
    const { disableExtensions } = internalOptions;
    if (disableExtensions || !this._spacesExtension) {
      namespaces = options.namespaces ?? [DEFAULT_NAMESPACE_STRING];
      // If the consumer specified `namespaces: []`, throw a Bad Request error
      if (namespaces.length === 0)
        throw SavedObjectsErrorHelpers.createBadRequestError(
          'options.namespaces cannot be an empty array'
        );
    }

    const {
      search,
      defaultSearchOperator = 'OR',
      searchFields,
      rootSearchFields,
      hasReference,
      hasReferenceOperator,
      page = FIND_DEFAULT_PAGE,
      perPage = FIND_DEFAULT_PER_PAGE,
      pit,
      searchAfter,
      sortField,
      sortOrder,
      fields,
      type,
      filter,
      preference,
      aggs,
    } = options;

    if (!type) {
      throw SavedObjectsErrorHelpers.createBadRequestError(
        'options.type must be a string or an array of strings'
      );
    } else if (preference?.length && pit) {
      throw SavedObjectsErrorHelpers.createBadRequestError(
        'options.preference must be excluded when options.pit is used'
      );
    }

    const types = Array.isArray(type) ? type : [type];
    const allowedTypes = types.filter((t) => this._allowedTypes.includes(t));
    if (allowedTypes.length === 0) {
      return SavedObjectsUtils.createEmptyFindResponse<T, A>(options);
    }

    if (searchFields && !Array.isArray(searchFields)) {
      throw SavedObjectsErrorHelpers.createBadRequestError('options.searchFields must be an array');
    }

    if (fields && !Array.isArray(fields)) {
      throw SavedObjectsErrorHelpers.createBadRequestError('options.fields must be an array');
    }

    let kueryNode;
    if (filter) {
      try {
        kueryNode = validateConvertFilterToKueryNode(allowedTypes, filter, this._mappings);
      } catch (e) {
        if (e.name === 'KQLSyntaxError') {
          throw SavedObjectsErrorHelpers.createBadRequestError(`KQLSyntaxError: ${e.message}`);
        } else {
          throw e;
        }
      }
    }

    let aggsObject;
    if (aggs) {
      try {
        aggsObject = validateAndConvertAggregations(allowedTypes, aggs, this._mappings);
      } catch (e) {
        throw SavedObjectsErrorHelpers.createBadRequestError(`Invalid aggregation: ${e.message}`);
      }
    }

    if (!disableExtensions && this._spacesExtension) {
      try {
        namespaces = await this._spacesExtension.getSearchableNamespaces(options.namespaces);
      } catch (err) {
        if (Boom.isBoom(err) && err.output.payload.statusCode === 403) {
          // The user is not authorized to access any space, return an empty response.
          return SavedObjectsUtils.createEmptyFindResponse<T, A>(options);
        }
        throw err;
      }
      if (namespaces.length === 0) {
        // The user is authorized to access *at least one space*, but not any of the spaces they requested; return an empty response.
        return SavedObjectsUtils.createEmptyFindResponse<T, A>(options);
      }
    }

    // We have to first do a "pre-authorization" check so that we can construct the search DSL accordingly
    const spacesToPreauthorize = new Set(namespaces);
    let typeToNamespacesMap: Map<string, string[]> | undefined;
    let preAuthorizationResult: CheckAuthorizationResult<'find'> | undefined;
    if (!disableExtensions && this._securityExtension) {
      preAuthorizationResult = await this._securityExtension.checkAuthorization({
        types: new Set(types),
        spaces: spacesToPreauthorize,
        actions: ['find'],
      });
      if (preAuthorizationResult.status === 'unauthorized') {
        // If the user is unauthorized to find *anything* they requested, return an empty response
        this._securityExtension.addAuditEvent({
          action: AuditAction.FIND,
          error: new Error(`User is unauthorized for any requested types/spaces.`),
          // TODO: include object type(s) that were requested?
          // requestedTypes: types,
          // requestedSpaces: namespaces,
        });
        return SavedObjectsUtils.createEmptyFindResponse<T, A>(options);
      }
      if (preAuthorizationResult.status === 'partially_authorized') {
        typeToNamespacesMap = new Map<string, string[]>();
        for (const [objType, entry] of preAuthorizationResult.typeMap) {
          if (!entry.find) continue;
          // This ensures that the query DSL can filter only for object types that the user is authorized to access for a given space
          const { authorizedSpaces, isGloballyAuthorized } = entry.find;
          typeToNamespacesMap.set(objType, isGloballyAuthorized ? namespaces : authorizedSpaces);
        }
      }
    }

    const esOptions = {
      // If `pit` is provided, we drop the `index`, otherwise ES returns 400.
      index: pit ? undefined : this.getIndicesForTypes(allowedTypes),
      // If `searchAfter` is provided, we drop `from` as it will not be used for pagination.
      from: searchAfter ? undefined : perPage * (page - 1),
      _source: includedFields(allowedTypes, fields),
      preference,
      rest_total_hits_as_int: true,
      size: perPage,
      body: {
        size: perPage,
        seq_no_primary_term: true,
        from: perPage * (page - 1),
        _source: includedFields(allowedTypes, fields),
        ...(aggsObject ? { aggs: aggsObject } : {}),
        ...getSearchDsl(this._mappings, this._registry, {
          search,
          defaultSearchOperator,
          searchFields,
          pit,
          rootSearchFields,
          type: allowedTypes,
          searchAfter,
          sortField,
          sortOrder,
          namespaces,
          typeToNamespacesMap, // If defined, this takes precedence over the `type` and `namespaces` fields
          hasReference,
          hasReferenceOperator,
          kueryNode,
        }),
      },
    };

    const { body, statusCode, headers } = await this.client.search<SavedObjectsRawDocSource>(
      esOptions,
      {
        ignore: [404],
        meta: true,
      }
    );
    if (statusCode === 404) {
      if (!isSupportedEsServer(headers)) {
        throw SavedObjectsErrorHelpers.createGenericNotFoundEsUnavailableError();
      }
      // 404 is only possible here if the index is missing, which
      // we don't want to leak, see "404s from missing index" above
      return SavedObjectsUtils.createEmptyFindResponse<T, A>(options);
    }

    const result = {
      ...(body.aggregations ? { aggregations: body.aggregations as unknown as A } : {}),
      page,
      per_page: perPage,
      total: body.hits.total,
      saved_objects: body.hits.hits.map(
        (hit: estypes.SearchHit<SavedObjectsRawDocSource>): SavedObjectsFindResult => ({
          // @ts-expect-error @elastic/elasticsearch _source is optional
          ...this._rawToSavedObject(hit),
          score: hit._score!,
          // @ts-expect-error @elastic/elasticsearch _source is optional
          sort: hit.sort,
        })
      ),
      pit_id: body.pit_id,
    } as SavedObjectsFindResponse<T, A>;

    if (disableExtensions) {
      return result;
    }

    const spacesToAuthorize = new Set<string>(spacesToPreauthorize); // only for namespace redaction
    for (const { type: objType, id, namespaces: objectNamespaces = [] } of result.saved_objects) {
      for (const space of objectNamespaces) {
        spacesToAuthorize.add(space);
      }
      this._securityExtension?.addAuditEvent({
        action: AuditAction.FIND,
        savedObject: { type: objType, id },
      });
    }
    const authorizationResult =
      spacesToAuthorize.size > spacesToPreauthorize.size
        ? // If there are any namespaces in the object results that were not already checked during pre-authorization, we need *another*
          // authorization check so we can correctly redact the object namespaces below.
          await this._securityExtension?.checkAuthorization({
            types: new Set(types),
            spaces: spacesToAuthorize,
            actions: ['find'],
          })
        : undefined;

    return this.optionallyDecryptAndRedactBulkResult(
      result,
      authorizationResult?.typeMap ?? preAuthorizationResult?.typeMap // If we made a second authorization check, use that one; otherwise, fall back to the pre-authorization check
    );
  }

  /**
   * Returns an array of objects by id
   *
   * @param {array} objects - an array of objects containing id, type and optionally fields
   * @param {object} [options={}]
   * @property {string} [options.namespace]
   * @returns {promise} - { saved_objects: [{ id, type, version, attributes }] }
   * @example
   *
   * bulkGet([
   *   { id: 'one', type: 'config' },
   *   { id: 'foo', type: 'index-pattern' }
   * ])
   */
  async bulkGet<T = unknown>(
    objects: SavedObjectsBulkGetObject[] = [],
    options: SavedObjectsBaseOptions = {}
  ): Promise<SavedObjectsBulkResponse<T>> {
    const namespace = this.getCurrentNamespace(options.namespace);

    if (objects.length === 0) {
      return { saved_objects: [] };
    }

    let availableSpacesPromise: Promise<string[]> | undefined;
    const getAvailableSpaces = async () => {
      if (!availableSpacesPromise) {
        // This function is only called below if the spaces extension is enabled, so we can safely use the non-null assertion operator here.
        availableSpacesPromise = this._spacesExtension!.getSearchableNamespaces([
          ALL_NAMESPACES_STRING,
        ]).catch((err) => {
          if (Boom.isBoom(err) && err.output.payload.statusCode === 403) {
            // the user doesn't have access to any spaces; return the current space ID and allow the SOR authZ check to fail
            return [SavedObjectsUtils.namespaceIdToString(namespace)];
          } else {
            throw err;
          }
        });
      }
      return availableSpacesPromise;
    };
    let bulkGetRequestIndexCounter = 0;
    type ExpectedBulkGetResult = Either<
      { type: string; id: string; error: Payload },
      { type: string; id: string; fields?: string[]; namespaces?: string[]; esRequestIndex: number }
    >;
    const expectedBulkGetResults = await Promise.all(
      objects.map<Promise<ExpectedBulkGetResult>>(async (object) => {
        const { type, id, fields } = object;

        let error: DecoratedError | undefined;
        if (!this._allowedTypes.includes(type)) {
          error = SavedObjectsErrorHelpers.createUnsupportedTypeError(type);
        } else {
          try {
            this.validateObjectNamespaces(type, id, object.namespaces);
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

        let namespaces = object.namespaces;
        if (this._spacesExtension && namespaces?.includes(ALL_NAMESPACES_STRING)) {
          namespaces = await getAvailableSpaces();
        }
        return {
          tag: 'Right',
          value: {
            type,
            id,
            fields,
            namespaces,
            esRequestIndex: bulkGetRequestIndexCounter++,
          },
        };
      })
    );

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

    const getNamespaceId = (namespaces?: string[]) =>
      namespaces !== undefined ? SavedObjectsUtils.namespaceStringToId(namespaces[0]) : namespace;
    const bulkGetDocs = validObjects.map(({ value: { type, id, fields, namespaces } }) => ({
      _id: this._serializer.generateRawId(getNamespaceId(namespaces), type, id), // the namespace prefix is only used for single-namespace object types
      _index: this.getIndexForType(type),
      _source: { includes: includedFields(type, fields) },
    }));
    const bulkGetResponse = bulkGetDocs.length
      ? await this.client.mget<SavedObjectsRawDocSource>(
          {
            body: {
              docs: bulkGetDocs,
            },
          },
          { ignore: [404], meta: true }
        )
      : undefined;
    // fail fast if we can't verify a 404 is from Elasticsearch
    if (
      bulkGetResponse &&
      isNotFoundFromUnsupportedServer({
        statusCode: bulkGetResponse.statusCode,
        headers: bulkGetResponse.headers,
      })
    ) {
      throw SavedObjectsErrorHelpers.createGenericNotFoundEsUnavailableError();
    }

    const typesAndSpaces = new Map<string, Set<string>>();
    const spacesToAuthorize = new Set<string>([SavedObjectsUtils.namespaceIdToString(namespace)]); // Always check authZ for the active space
    const result = {
      saved_objects: expectedBulkGetResults.map((expectedResult) => {
        if (isLeft(expectedResult)) {
          return expectedResult.value as any;
        }

        const {
          type,
          id,
          namespaces = [SavedObjectsUtils.namespaceIdToString(namespace)], // set to default value for `rawDocExistsInNamespaces` check below
          esRequestIndex,
        } = expectedResult.value;
        const doc = bulkGetResponse?.body.docs[esRequestIndex];

        const spacesToEnforce =
          typesAndSpaces.get(type) ?? new Set([SavedObjectsUtils.namespaceIdToString(namespace)]); // Always enforce authZ for the active space
        for (const space of namespaces) {
          spacesToEnforce.add(space);
          typesAndSpaces.set(type, spacesToEnforce);
          spacesToAuthorize.add(space);
        }

        // @ts-expect-error MultiGetHit._source is optional
        for (const space of doc?._source?.namespaces ?? []) {
          spacesToAuthorize.add(space); // existing namespaces are included so we can later redact if necessary
        }

        // @ts-expect-error MultiGetHit._source is optional
        if (!doc?.found || !this.rawDocExistsInNamespaces(doc, namespaces)) {
          return {
            id,
            type,
            error: errorContent(SavedObjectsErrorHelpers.createGenericNotFoundError(type, id)),
          } as any as SavedObject<T>;
        }

        // @ts-expect-error MultiGetHit._source is optional
        return getSavedObjectFromSource(this._registry, type, id, doc);
      }),
    };

    const authorizationResult = await this._securityExtension?.checkAuthorization({
      types: new Set(typesAndSpaces.keys()),
      spaces: spacesToAuthorize,
      actions: ['bulk_get'],
    });
    if (authorizationResult) {
      this._securityExtension!.enforceAuthorization({
        typesAndSpaces,
        action: 'bulk_get',
        typeMap: authorizationResult.typeMap,
        auditCallback: (error) => {
          for (const { type, id, error: bulkError } of result.saved_objects) {
            if (!error && !!bulkError) continue; // Only log success events for objects that were actually found (and are being returned to the user)
            this._securityExtension!.addAuditEvent({
              action: AuditAction.GET,
              savedObject: { type, id },
              error,
            });
          }
        },
      });
    }

    return this.optionallyDecryptAndRedactBulkResult(result, authorizationResult?.typeMap);
  }

  /**
   * Resolves an array of objects by id, using any legacy URL aliases if they exist
   *
   * @param {array} objects - an array of objects containing id, type
   * @param {object} [options={}]
   * @property {string} [options.namespace]
   * @returns {promise} - { resolved_objects: [{ saved_object, outcome }] }
   * @example
   *
   * bulkResolve([
   *   { id: 'one', type: 'config' },
   *   { id: 'foo', type: 'index-pattern' }
   * ])
   */
  async bulkResolve<T = unknown>(
    objects: SavedObjectsBulkResolveObject[],
    options: SavedObjectsBaseOptions = {}
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
        const errorResult = result as InternalBulkResolveError;
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
   * Gets a single object
   *
   * @param {string} type
   * @param {string} id
   * @param {object} [options={}]
   * @property {string} [options.namespace]
   * @returns {promise} - { id, type, version, attributes }
   */
  async get<T = unknown>(
    type: string,
    id: string,
    options: SavedObjectsBaseOptions = {}
  ): Promise<SavedObject<T>> {
    const namespace = this.getCurrentNamespace(options.namespace);

    if (!this._allowedTypes.includes(type)) {
      throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
    }
    const { body, statusCode, headers } = await this.client.get<SavedObjectsRawDocSource>(
      {
        id: this._serializer.generateRawId(namespace, type, id),
        index: this.getIndexForType(type),
      },
      { ignore: [404], meta: true }
    );
    const indexNotFound = statusCode === 404;
    // check if we have the elasticsearch header when index is not found and, if we do, ensure it is from Elasticsearch
    if (indexNotFound && !isSupportedEsServer(headers)) {
      throw SavedObjectsErrorHelpers.createGenericNotFoundEsUnavailableError(type, id);
    }

    const spacesToEnforce = new Set([SavedObjectsUtils.namespaceIdToString(namespace)]); // Always check/enforce authZ for the active space
    const existingNamespaces = body?._source?.namespaces || [];
    const authorizationResult = await this._securityExtension?.checkAuthorization({
      types: new Set([type]),
      spaces: new Set([...spacesToEnforce, ...existingNamespaces]), // existing namespaces are included so we can later redact if necessary
      actions: ['get'],
    });
    if (authorizationResult) {
      this._securityExtension!.enforceAuthorization({
        typesAndSpaces: new Map([[type, spacesToEnforce]]),
        action: 'get',
        typeMap: authorizationResult.typeMap,
        auditCallback: (error) => {
          if (error) {
            this._securityExtension!.addAuditEvent({
              action: AuditAction.GET,
              savedObject: { type, id },
              error,
            });
          }
          // Audit event for success case is added separately below
        },
      });
    }

    if (
      !isFoundGetResponse(body) ||
      indexNotFound ||
      !this.rawDocExistsInNamespace(body, namespace)
    ) {
      // see "404s from missing index" above
      throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
    }
    // Only log a success event if the object was actually found (and is being returned to the user)
    this._securityExtension?.addAuditEvent({
      action: AuditAction.GET,
      savedObject: { type, id },
    });

    const result = getSavedObjectFromSource<T>(this._registry, type, id, body);

    return this.optionallyDecryptAndRedactSingleResult(result, authorizationResult?.typeMap);
  }

  /**
   * Resolves a single object, using any legacy URL alias if it exists
   *
   * @param {string} type
   * @param {string} id
   * @param {object} [options={}]
   * @property {string} [options.namespace]
   * @returns {promise} - { saved_object, outcome }
   */
  async resolve<T = unknown>(
    type: string,
    id: string,
    options: SavedObjectsBaseOptions = {}
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
   * Updates an object
   *
   * @param {string} type
   * @param {string} id
   * @param {object} [options={}]
   * @property {string} options.version - ensures version matches that of persisted object
   * @property {string} [options.namespace]
   * @property {array} [options.references] - [{ name, type, id }]
   * @returns {promise}
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
      preflightResult = await this.preflightCheckNamespaces({
        type,
        id,
        namespace,
      });
    }

    const spacesToEnforce = new Set([SavedObjectsUtils.namespaceIdToString(namespace)]); // Always check/enforce authZ for the active space
    const existingNamespaces = preflightResult?.savedObjectNamespaces || [];
    const authorizationResult = await this._securityExtension?.checkAuthorization({
      types: new Set([type]),
      spaces: new Set([...spacesToEnforce, ...existingNamespaces]), // existing namespaces are included so we can later redact if necessary
      actions: ['update'],
    });
    if (authorizationResult) {
      this._securityExtension!.enforceAuthorization({
        typesAndSpaces: new Map([[type, spacesToEnforce]]),
        action: 'update',
        typeMap: authorizationResult.typeMap,
        auditCallback: (error) =>
          this._securityExtension!.addAuditEvent({
            action: AuditAction.UPDATE,
            savedObject: { type, id },
            error,
            ...(!error && { outcome: 'unknown' }), // If authorization was a success, the outcome is unknown because the update/upsert operation has not occurred yet
          }),
      });
    }

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
      await this.preflightCheckForUpsertAliasConflict(type, id, namespace);
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
          ...(await this.optionallyEncryptAttributes(type, id, options.namespace, upsert)),
        },
        updated_at: time,
      });
      rawUpsert = this._serializer.savedObjectToRaw(migrated as SavedObjectSanitizedDoc);
    }

    const doc = {
      [type]: await this.optionallyEncryptAttributes(type, id, options.namespace, attributes),
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

    return this.optionallyDecryptAndRedactSingleResult(
      result,
      authorizationResult?.typeMap,
      attributes
    );
  }

  /**
   * Gets all references and transitive references of the given objects. Ignores any object and/or reference that is not a multi-namespace
   * type.
   *
   * @param objects The objects to get the references for.
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
   * Updates one or more objects to add and/or remove them from specified spaces.
   *
   * @param objects
   * @param spacesToAdd
   * @param spacesToRemove
   * @param options
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
   * Updates multiple objects in bulk
   *
   * @param {array} objects - [{ type, id, attributes, options: { version, namespace } references }]
   * @property {string} options.version - ensures version matches that of persisted object
   * @property {string} [options.namespace]
   * @returns {promise} -  {saved_objects: [[{ id, type, version, references, attributes, error: { message } }]}
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

      // `objectNamespace` is a namespace string, while `namespace` is a namespace ID.
      // The object namespace string, if defined, will supersede the operation's namespace ID.

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

    const typesAndSpaces = new Map<string, Set<string>>();
    const spacesToAuthorize = new Set<string>([namespaceString]); // Always check authZ for the active space
    for (const { value } of validObjects) {
      const { type, objectNamespace, esRequestIndex: index } = value;
      const objectNamespaceString = getNamespaceString(objectNamespace);
      const preflightResult = index !== undefined ? bulkGetResponse?.body.docs[index] : undefined;

      const spacesToEnforce = typesAndSpaces.get(type) ?? new Set([namespaceString]); // Always enforce authZ for the active space
      spacesToEnforce.add(objectNamespaceString);
      typesAndSpaces.set(type, spacesToEnforce);
      spacesToAuthorize.add(objectNamespaceString);
      // @ts-expect-error MultiGetHit._source is optional
      for (const space of preflightResult?._source?.namespaces ?? []) {
        spacesToAuthorize.add(space); // existing namespaces are included so we can later redact if necessary
      }
    }

    const authorizationResult = await this._securityExtension?.checkAuthorization({
      types: new Set(typesAndSpaces.keys()),
      spaces: spacesToAuthorize,
      actions: ['bulk_update'],
    });
    if (authorizationResult) {
      this._securityExtension!.enforceAuthorization({
        typesAndSpaces,
        action: 'bulk_update',
        typeMap: authorizationResult.typeMap,
        auditCallback: (error) => {
          for (const { value } of validObjects) {
            this._securityExtension!.addAuditEvent({
              action: AuditAction.UPDATE,
              savedObject: { type: value.type, id: value.id },
              error,
              ...(!error && { outcome: 'unknown' }), // If authorization was a success, the outcome is unknown because the update operation has not occurred yet
            });
          }
        },
      });
    }

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
                [type]: await this.optionallyEncryptAttributes(
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

    return this.optionallyDecryptAndRedactBulkResult(result, authorizationResult?.typeMap, objects);
  }

  /**
   * Updates all objects containing a reference to the given {type, id} tuple to remove the said reference.
   *
   * @remarks Will throw a conflict error if the `update_by_query` operation returns any failure. In that case
   *          some references might have been removed, and some were not. It is the caller's responsibility
   *          to handle and fix this situation if it was to happen.
   */
  async removeReferencesTo(
    type: string,
    id: string,
    options: SavedObjectsRemoveReferencesToOptions = {}
  ): Promise<SavedObjectsRemoveReferencesToResponse> {
    const namespace = this.getCurrentNamespace(options.namespace);
    const { refresh = true } = options;

    // TODO: Improve authorization and auditing (https://github.com/elastic/kibana/issues/135259)

    const spaces = new Set([SavedObjectsUtils.namespaceIdToString(namespace)]); // Always check/enforce authZ for the active space
    const authorizationResult = await this._securityExtension?.checkAuthorization({
      types: new Set([type]),
      spaces,
      actions: ['delete'],
    });
    if (authorizationResult) {
      this._securityExtension!.enforceAuthorization({
        typesAndSpaces: new Map([[type, spaces]]),
        action: 'delete',
        typeMap: authorizationResult.typeMap,
        auditCallback: (error) =>
          this._securityExtension!.addAuditEvent({
            action: AuditAction.REMOVE_REFERENCES,
            savedObject: { type, id },
            error,
            ...(!error && { outcome: 'unknown' }), // If authorization was a success, the outcome is unknown because the updateByQuery operation has not occurred yet
          }),
      });
    }

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
   * Increments all the specified counter fields (by one by default). Creates the document
   * if one doesn't exist for the given id.
   *
   * @remarks
   * When supplying a field name like `stats.api.counter` the field name will
   * be used as-is to create a document like:
   *   `{attributes: {'stats.api.counter': 1}}`
   * It will not create a nested structure like:
   *   `{attributes: {stats: {api: {counter: 1}}}}`
   *
   * When using incrementCounter for collecting usage data, you need to ensure
   * that usage collection happens on a best-effort basis and doesn't
   * negatively affect your plugin or users. See https://github.com/elastic/kibana/blob/main/src/plugins/usage_collection/README.mdx#tracking-interactions-with-incrementcounter)
   *
   * @example
   * ```ts
   * const repository = coreStart.savedObjects.createInternalRepository();
   *
   * // Initialize all fields to 0
   * repository
   *   .incrementCounter('dashboard_counter_type', 'counter_id', [
   *     'stats.apiCalls',
   *     'stats.sampleDataInstalled',
   *   ], {initialize: true});
   *
   * // Increment the apiCalls field counter
   * repository
   *   .incrementCounter('dashboard_counter_type', 'counter_id', [
   *     'stats.apiCalls',
   *   ])
   *
   * // Increment the apiCalls field counter by 4
   * repository
   *   .incrementCounter('dashboard_counter_type', 'counter_id', [
   *     { fieldName: 'stats.apiCalls' incrementBy: 4 },
   *   ])
   *
   * // Initialize the document with arbitrary fields if not present
   * repository.incrementCounter<{ appId: string }>(
   *   'dashboard_counter_type',
   *   'counter_id',
   *   [ 'stats.apiCalls'],
   *   { upsertAttributes: { appId: 'myId' } }
   * )
   * ```
   *
   * @param type - The type of saved object whose fields should be incremented
   * @param id - The id of the document whose fields should be incremented
   * @param counterFields - An array of field names to increment or an array of {@link SavedObjectsIncrementCounterField}
   * @param options - {@link SavedObjectsIncrementCounterOptions}
   * @returns The saved object after the specified fields were incremented
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
      refresh = DEFAULT_REFRESH_SETTING,
      initialize = false,
      upsertAttributes,
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
      const preflightResult = await this.preflightCheckNamespaces({
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
        await this.preflightCheckForUpsertAliasConflict(type, id, namespace);
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
    };
  }

  /**
   * Opens a Point In Time (PIT) against the indices for the specified Saved Object types.
   * The returned `id` can then be passed to `SavedObjects.find` to search against that PIT.
   *
   * Only use this API if you have an advanced use case that's not solved by the
   * {@link SavedObjectsRepository.createPointInTimeFinder} method.
   *
   * @example
   * ```ts
   * const { id } = await savedObjectsClient.openPointInTimeForType(
   *   type: 'visualization',
   *   { keepAlive: '5m' },
   * );
   * const page1 = await savedObjectsClient.find({
   *   type: 'visualization',
   *   sortField: 'updated_at',
   *   sortOrder: 'asc',
   *   pit: { id, keepAlive: '2m' },
   * });
   * const lastHit = page1.saved_objects[page1.saved_objects.length - 1];
   * const page2 = await savedObjectsClient.find({
   *   type: 'visualization',
   *   sortField: 'updated_at',
   *   sortOrder: 'asc',
   *   pit: { id: page1.pit_id },
   *   searchAfter: lastHit.sort,
   * });
   * await savedObjectsClient.closePointInTime(page2.pit_id);
   * ```
   *
   * @param {string|Array<string>} type
   * @param {object} [options] - {@link SavedObjectsOpenPointInTimeOptions}
   * @property {string} [options.keepAlive]
   * @property {string} [options.preference]
   * @returns {promise} - { id: string }
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
      const spaces = new Set(namespaces);
      const preAuthorizationResult = await this._securityExtension.checkAuthorization({
        types: new Set(types),
        spaces,
        actions: ['open_point_in_time'],
      });
      if (preAuthorizationResult.status === 'unauthorized') {
        // If the user is unauthorized to find *anything* they requested, return an empty response
        this._securityExtension.addAuditEvent({
          action: AuditAction.OPEN_POINT_IN_TIME,
          error: new Error('User is unauthorized for any requested types/spaces.'),
          // TODO: include object type(s) that were requested?
          // requestedTypes: types,
          // requestedSpaces: namespaces,
        });
        throw SavedObjectsErrorHelpers.decorateForbiddenError(new Error('unauthorized'));
      }
      this._securityExtension.addAuditEvent({
        action: AuditAction.OPEN_POINT_IN_TIME,
        outcome: 'unknown',
        // TODO: include object type(s) that were requested?
        // requestedTypes: types,
        // requestedSpaces: namespaces,
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
   * Closes a Point In Time (PIT) by ID. This simply proxies the request to ES
   * via the Elasticsearch client, and is included in the Saved Objects Client
   * as a convenience for consumers who are using `openPointInTimeForType`.
   *
   * Only use this API if you have an advanced use case that's not solved by the
   * {@link SavedObjectsRepository.createPointInTimeFinder} method.
   *
   * @remarks
   * While the `keepAlive` that is provided will cause a PIT to automatically close,
   * it is highly recommended to explicitly close a PIT when you are done with it
   * in order to avoid consuming unneeded resources in Elasticsearch.
   *
   * @example
   * ```ts
   * const repository = coreStart.savedObjects.createInternalRepository();
   *
   * const { id } = await repository.openPointInTimeForType(
   *   type: 'index-pattern',
   *   { keepAlive: '2m' },
   * );
   *
   * const response = await repository.find({
   *   type: 'index-pattern',
   *   search: 'foo*',
   *   sortField: 'name',
   *   sortOrder: 'desc',
   *   pit: {
   *     id: 'abc123',
   *     keepAlive: '2m',
   *   },
   *   searchAfter: [1234, 'abcd'],
   * });
   *
   * await repository.closePointInTime(response.pit_id);
   * ```
   *
   * @param {string} id
   * @param {object} [options] - {@link SavedObjectsClosePointInTimeOptions}
   * @returns {promise} - {@link SavedObjectsClosePointInTimeResponse}
   */
  async closePointInTime(
    id: string,
    options?: SavedObjectsClosePointInTimeOptions,
    internalOptions: SavedObjectsFindInternalOptions = {}
  ): Promise<SavedObjectsClosePointInTimeResponse> {
    const { disableExtensions } = internalOptions;

    if (!disableExtensions && this._securityExtension) {
      this._securityExtension.addAuditEvent({
        action: AuditAction.CLOSE_POINT_IN_TIME,
        outcome: 'unknown',
      });
    }

    return await this.client.closePointInTime({
      body: { id },
    });
  }

  /**
   * Returns a {@link ISavedObjectsPointInTimeFinder} to help page through
   * large sets of saved objects. We strongly recommend using this API for
   * any `find` queries that might return more than 1000 saved objects,
   * however this API is only intended for use in server-side "batch"
   * processing of objects where you are collecting all objects in memory
   * or streaming them back to the client.
   *
   * Do NOT use this API in a route handler to facilitate paging through
   * saved objects on the client-side unless you are streaming all of the
   * results back to the client at once. Because the returned generator is
   * stateful, you cannot rely on subsequent http requests retrieving new
   * pages from the same Kibana server in multi-instance deployments.
   *
   * This generator wraps calls to {@link SavedObjectsRepository.find} and
   * iterates over multiple pages of results using `_pit` and `search_after`.
   * This will open a new Point-In-Time (PIT), and continue paging until a
   * set of results is received that's smaller than the designated `perPage`.
   *
   * Once you have retrieved all of the results you need, it is recommended
   * to call `close()` to clean up the PIT and prevent Elasticsearch from
   * consuming resources unnecessarily. This is only required if you are
   * done iterating and have not yet paged through all of the results: the
   * PIT will automatically be closed for you once you reach the last page
   * of results, or if the underlying call to `find` fails for any reason.
   *
   * @example
   * ```ts
   * const findOptions: SavedObjectsCreatePointInTimeFinderOptions = {
   *   type: 'visualization',
   *   search: 'foo*',
   *   perPage: 100,
   * };
   *
   * const finder = savedObjectsClient.createPointInTimeFinder(findOptions);
   *
   * const responses: SavedObjectFindResponse[] = [];
   * for await (const response of finder.find()) {
   *   responses.push(...response);
   *   if (doneSearching) {
   *     await finder.close();
   *   }
   * }
   * ```
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
   * Returns index specified by the given type or the default index
   *
   * @param type - the type
   */
  private getIndexForType(type: string) {
    return getIndexForType({
      type,
      defaultIndex: this._index,
      typeRegistry: this._registry,
      kibanaVersion: this._migrator.kibanaVersion,
    });
  }

  /**
   * Returns an array of indices as specified in `this._registry` for each of the
   * given `types`. If any of the types don't have an associated index, the
   * default index `this._index` will be included.
   *
   * @param types The types whose indices should be retrieved
   */
  private getIndicesForTypes(types: string[]) {
    return unique(types.map((t) => this.getIndexForType(t)));
  }

  private _rawToSavedObject<T = unknown>(raw: SavedObjectsRawDoc): SavedObject<T> {
    const savedObject = this._serializer.rawToSavedObject(raw);
    const { namespace, type } = savedObject;
    if (this._registry.isSingleNamespace(type)) {
      savedObject.namespaces = [SavedObjectsUtils.namespaceIdToString(namespace)];
    }
    return omit(savedObject, ['namespace']) as SavedObject<T>;
  }

  private rawDocExistsInNamespaces(raw: SavedObjectsRawDoc, namespaces: string[]) {
    return rawDocExistsInNamespaces(this._registry, raw, namespaces);
  }

  private rawDocExistsInNamespace(raw: SavedObjectsRawDoc, namespace: string | undefined) {
    return rawDocExistsInNamespace(this._registry, raw, namespace);
  }

  /**
   * Pre-flight check to ensure that a multi-namespace object exists in the current namespace.
   */
  private async preflightCheckNamespaces({
    type,
    id,
    namespace,
    initialNamespaces,
  }: PreflightCheckNamespacesParams): Promise<PreflightCheckNamespacesResult> {
    if (!this._registry.isMultiNamespace(type)) {
      throw new Error(`Cannot make preflight get request for non-multi-namespace type '${type}'.`);
    }

    const { body, statusCode, headers } = await this.client.get<SavedObjectsRawDocSource>(
      {
        id: this._serializer.generateRawId(undefined, type, id),
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
      if (!this.rawDocExistsInNamespaces(body, namespaces)) {
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
  private async preflightCheckForUpsertAliasConflict(
    type: string,
    id: string,
    namespace: string | undefined
  ) {
    const namespaceString = SavedObjectsUtils.namespaceIdToString(namespace);
    const [{ error }] = await preflightCheckForCreate({
      registry: this._registry,
      client: this.client,
      serializer: this._serializer,
      getIndexForType: this.getIndexForType.bind(this),
      createPointInTimeFinder: this.createPointInTimeFinder.bind(this),
      objects: [{ type, id, namespaces: [namespaceString] }],
    });
    if (error?.type === 'aliasConflict') {
      throw SavedObjectsErrorHelpers.createConflictError(type, id);
    }
    // any other error from this check does not matter
  }

  /**
   * If the spaces extension is enabled, we should use that to get the current namespace (and optionally throw an error if a consumer
   * attempted to specify the namespace option).
   *
   * If the spaces extension is *not* enabled, we should simply normalize the namespace option so that `'default'` can be used
   * interchangeably with `undefined`.
   */
  private getCurrentNamespace(namespace?: string) {
    if (this._spacesExtension) {
      return this._spacesExtension.getCurrentNamespace(namespace);
    }
    return normalizeNamespace(namespace);
  }

  /** The `initialNamespaces` field (create, bulkCreate) is used to create an object in an initial set of spaces. */
  private validateInitialNamespaces(type: string, initialNamespaces: string[] | undefined) {
    if (!initialNamespaces) {
      return;
    }

    if (this._registry.isNamespaceAgnostic(type)) {
      throw SavedObjectsErrorHelpers.createBadRequestError(
        '"initialNamespaces" cannot be used on space-agnostic types'
      );
    } else if (!initialNamespaces.length) {
      throw SavedObjectsErrorHelpers.createBadRequestError(
        '"initialNamespaces" must be a non-empty array of strings'
      );
    } else if (
      !this._registry.isShareable(type) &&
      (initialNamespaces.length > 1 || initialNamespaces.includes(ALL_NAMESPACES_STRING))
    ) {
      throw SavedObjectsErrorHelpers.createBadRequestError(
        '"initialNamespaces" can only specify a single space when used with space-isolated types'
      );
    }
  }

  /** The object-specific `namespaces` field (bulkGet) is used to check if an object exists in any of a given number of spaces. */
  private validateObjectNamespaces(type: string, id: string, namespaces: string[] | undefined) {
    if (!namespaces) {
      return;
    }

    if (this._registry.isNamespaceAgnostic(type)) {
      throw SavedObjectsErrorHelpers.createBadRequestError(
        '"namespaces" cannot be used on space-agnostic types'
      );
    } else if (!namespaces.length) {
      throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
    } else if (
      !this._registry.isShareable(type) &&
      (namespaces.length > 1 || namespaces.includes(ALL_NAMESPACES_STRING))
    ) {
      throw SavedObjectsErrorHelpers.createBadRequestError(
        '"namespaces" can only specify a single space when used with space-isolated types'
      );
    }
  }

  /** Validate a migrated doc against the registered saved object type's schema. */
  private validateObjectAttributes(type: string, doc: SavedObjectSanitizedDoc) {
    const savedObjectType = this._registry.getType(type);
    if (!savedObjectType?.schemas) {
      return;
    }

    const validator = new SavedObjectsTypeValidator({
      logger: this._logger.get('type-validator'),
      type,
      validationMap: savedObjectType.schemas,
    });

    try {
      validator.validate(this._migrator.kibanaVersion, doc);
    } catch (error) {
      throw SavedObjectsErrorHelpers.createBadRequestError(error.message);
    }
  }

  /** This is used when objects are created. */
  private validateOriginId(type: string, objectOrOptions: { originId?: string }) {
    if (
      Object.keys(objectOrOptions).includes('originId') &&
      !this._registry.isMultiNamespace(type)
    ) {
      throw SavedObjectsErrorHelpers.createBadRequestError(
        '"originId" can only be set for multi-namespace object types'
      );
    }
  }

  /**
   * Saved objects with encrypted attributes should have IDs that are hard to guess, especially since IDs are part of the AAD used during
   * encryption, that's why we control them within this function and don't allow consumers to specify their own IDs directly for encryptable
   * types unless overwriting the original document.
   */
  private getValidId(
    type: string,
    id: string | undefined,
    version: string | undefined,
    overwrite: boolean | undefined
  ) {
    if (!this._encryptionExtension?.isEncryptableType(type)) {
      return id || SavedObjectsUtils.generateId();
    }
    if (!id) {
      return SavedObjectsUtils.generateId();
    }
    // only allow a specified ID if we're overwriting an existing ESO with a Version
    // this helps us ensure that the document really was previously created using ESO
    // and not being used to get around the specified ID limitation
    const canSpecifyID = (overwrite && version) || SavedObjectsUtils.isRandomId(id);
    if (!canSpecifyID) {
      throw SavedObjectsErrorHelpers.createBadRequestError(
        'Predefined IDs are not allowed for saved objects with encrypted attributes unless the ID is a UUID.'
      );
    }
    return id;
  }

  private async optionallyEncryptAttributes<T>(
    type: string,
    id: string,
    namespaceOrNamespaces: string | string[] | undefined,
    attributes: T
  ): Promise<T> {
    if (!this._encryptionExtension?.isEncryptableType(type)) {
      return attributes;
    }
    const namespace = Array.isArray(namespaceOrNamespaces)
      ? namespaceOrNamespaces[0]
      : namespaceOrNamespaces;
    const descriptor = { type, id, namespace };
    return this._encryptionExtension.encryptAttributes(
      descriptor,
      attributes as Record<string, unknown>
    ) as unknown as T;
  }

  private async optionallyDecryptAndRedactSingleResult<T, A extends string>(
    object: SavedObject<T>,
    typeMap: AuthorizationTypeMap<A> | undefined,
    originalAttributes?: T
  ) {
    if (this._encryptionExtension?.isEncryptableType(object.type)) {
      object = await this._encryptionExtension.decryptOrStripResponseAttributes(
        object,
        originalAttributes
      );
    }
    if (typeMap) {
      return this._securityExtension!.redactNamespaces({ typeMap, savedObject: object });
    }
    return object;
  }

  private async optionallyDecryptAndRedactBulkResult<
    T,
    R extends { saved_objects: Array<SavedObject<T>> },
    A extends string,
    O extends Array<{ attributes: T }>
  >(response: R, typeMap: AuthorizationTypeMap<A> | undefined, originalObjects?: O) {
    const modifiedObjects = await Promise.all(
      response.saved_objects.map(async (object, index) => {
        if (object.error) {
          // If the bulk operation failed, the object will not have an attributes field at all, it will have an error field instead.
          // In this case, don't attempt to decrypt, just return the object.
          return object;
        }
        const originalAttributes = originalObjects?.[index].attributes;
        return await this.optionallyDecryptAndRedactSingleResult(
          object,
          typeMap,
          originalAttributes
        );
      })
    );
    return { ...response, saved_objects: modifiedObjects };
  }
}

/**
 * Returns a string array of namespaces for a given saved object. If the saved object is undefined, the result is an array that contains the
 * current namespace. Value may be undefined if an existing saved object has no namespaces attribute; this should not happen in normal
 * operations, but it is possible if the Elasticsearch document is manually modified.
 *
 * @param namespace The current namespace.
 * @param document Optional existing saved object that was obtained in a preflight operation.
 */
function getSavedObjectNamespaces(
  namespace?: string,
  document?: SavedObjectsRawDoc
): string[] | undefined {
  if (document) {
    return document._source?.namespaces;
  }
  return [SavedObjectsUtils.namespaceIdToString(namespace)];
}

/**
 * Extracts the contents of a decorated error to return the attributes for bulk operations.
 */
const errorContent = (error: DecoratedError) => error.output.payload;

const unique = (array: string[]) => [...new Set(array)];

/**
 * Type and type guard function for converting a possibly not existent doc to an existent doc.
 */
type GetResponseFound<TDocument = unknown> = estypes.GetResponse<TDocument> &
  Required<
    Pick<estypes.GetResponse<TDocument>, '_primary_term' | '_seq_no' | '_version' | '_source'>
  >;

const isFoundGetResponse = <TDocument = unknown>(
  doc: estypes.GetResponse<TDocument>
): doc is GetResponseFound<TDocument> => doc.found;
