/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { omit } from 'lodash';
import uuid from 'uuid';
import {
  ElasticsearchClient,
  DeleteDocumentResponse,
  GetResponse,
  SearchResponse,
} from '../../../elasticsearch/';
import { getRootPropertiesObjects, IndexMapping } from '../../mappings';
import { createRepositoryEsClient, RepositoryEsClient } from './repository_es_client';
import { getSearchDsl } from './search_dsl';
import { includedFields } from './included_fields';
import { SavedObjectsErrorHelpers, DecoratedError } from './errors';
import { decodeRequestVersion, encodeVersion, encodeHitVersion } from '../../version';
import { KibanaMigrator } from '../../migrations';
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
  SavedObjectsUpdateOptions,
  SavedObjectsUpdateResponse,
  SavedObjectsBulkUpdateObject,
  SavedObjectsBulkUpdateOptions,
  SavedObjectsDeleteOptions,
  SavedObjectsAddToNamespacesOptions,
  SavedObjectsAddToNamespacesResponse,
  SavedObjectsDeleteFromNamespacesOptions,
  SavedObjectsDeleteFromNamespacesResponse,
} from '../saved_objects_client';
import {
  SavedObject,
  SavedObjectsBaseOptions,
  SavedObjectsFindOptions,
  SavedObjectsMigrationVersion,
  MutatingOperationRefreshSetting,
} from '../../types';
import { SavedObjectTypeRegistry } from '../../saved_objects_type_registry';
import { validateConvertFilterToKueryNode } from './filter_utils';

// BEWARE: The SavedObjectClient depends on the implementation details of the SavedObjectsRepository
// so any breaking changes to this repository are considered breaking changes to the SavedObjectsClient.

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type Left = { tag: 'Left'; error: Record<string, any> };
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type Right = { tag: 'Right'; value: Record<string, any> };
type Either = Left | Right;
const isLeft = (either: Either): either is Left => either.tag === 'Left';
const isRight = (either: Either): either is Right => either.tag === 'Right';

export interface SavedObjectsRepositoryOptions {
  index: string;
  mappings: IndexMapping;
  client: ElasticsearchClient;
  typeRegistry: SavedObjectTypeRegistry;
  serializer: SavedObjectsSerializer;
  migrator: KibanaMigrator;
  allowedTypes: string[];
}

/**
 * @public
 */
export interface SavedObjectsIncrementCounterOptions extends SavedObjectsBaseOptions {
  migrationVersion?: SavedObjectsMigrationVersion;
  /** The Elasticsearch Refresh setting for this operation */
  refresh?: MutatingOperationRefreshSetting;
}

/**
 *
 * @public
 */
export interface SavedObjectsDeleteByNamespaceOptions extends SavedObjectsBaseOptions {
  /** The Elasticsearch supports only boolean flag for this operation */
  refresh?: boolean;
}

const DEFAULT_REFRESH_SETTING = 'wait_for';

/**
 * See {@link SavedObjectsRepository}
 *
 * @public
 */
export type ISavedObjectsRepository = Pick<SavedObjectsRepository, keyof SavedObjectsRepository>;

/**
 * @public
 */
export class SavedObjectsRepository {
  private _migrator: KibanaMigrator;
  private _index: string;
  private _mappings: IndexMapping;
  private _registry: SavedObjectTypeRegistry;
  private _allowedTypes: string[];
  private readonly client: RepositoryEsClient;
  private _serializer: SavedObjectsSerializer;

  /**
   * A factory function for creating SavedObjectRepository instances.
   *
   * @internalRemarks
   * Tests are located in ./repository_create_repository.test.ts
   *
   * @internal
   */
  public static createRepository(
    migrator: KibanaMigrator,
    typeRegistry: SavedObjectTypeRegistry,
    indexName: string,
    client: ElasticsearchClient,
    includedHiddenTypes: string[] = [],
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
    const {
      id,
      migrationVersion,
      namespace,
      overwrite = false,
      references = [],
      refresh = DEFAULT_REFRESH_SETTING,
      originId,
      version,
    } = options;

    if (!this._allowedTypes.includes(type)) {
      throw SavedObjectsErrorHelpers.createUnsupportedTypeError(type);
    }

    const time = this._getCurrentTime();
    let savedObjectNamespace;
    let savedObjectNamespaces: string[] | undefined;

    if (this._registry.isSingleNamespace(type) && namespace) {
      savedObjectNamespace = namespace;
    } else if (this._registry.isMultiNamespace(type)) {
      if (id && overwrite) {
        // we will overwrite a multi-namespace saved object if it exists; if that happens, ensure we preserve its included namespaces
        savedObjectNamespaces = await this.preflightGetNamespaces(type, id, namespace);
      } else {
        savedObjectNamespaces = getSavedObjectNamespaces(namespace);
      }
    }

    const migrated = this._migrator.migrateDocument({
      id,
      type,
      ...(savedObjectNamespace && { namespace: savedObjectNamespace }),
      ...(savedObjectNamespaces && { namespaces: savedObjectNamespaces }),
      originId,
      attributes,
      migrationVersion,
      updated_at: time,
      ...(Array.isArray(references) && { references }),
    });

    const raw = this._serializer.savedObjectToRaw(migrated as SavedObjectSanitizedDoc);

    const requestParams = {
      id: raw._id,
      index: this.getIndexForType(type),
      refresh,
      body: raw._source,
      ...(overwrite && version ? decodeRequestVersion(version) : {}),
    };

    const { body } =
      id && overwrite
        ? await this.client.index(requestParams)
        : await this.client.create(requestParams);

    return this._rawToSavedObject<T>({
      ...raw,
      ...body,
    });
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
    const { namespace, overwrite = false, refresh = DEFAULT_REFRESH_SETTING } = options;
    const time = this._getCurrentTime();

    let bulkGetRequestIndexCounter = 0;
    const expectedResults: Either[] = objects.map((object) => {
      if (!this._allowedTypes.includes(object.type)) {
        return {
          tag: 'Left' as 'Left',
          error: {
            id: object.id,
            type: object.type,
            error: errorContent(SavedObjectsErrorHelpers.createUnsupportedTypeError(object.type)),
          },
        };
      }

      const method = object.id && overwrite ? 'index' : 'create';
      const requiresNamespacesCheck = object.id && this._registry.isMultiNamespace(object.type);

      if (object.id == null) object.id = uuid.v1();

      return {
        tag: 'Right' as 'Right',
        value: {
          method,
          object,
          ...(requiresNamespacesCheck && { esRequestIndex: bulkGetRequestIndexCounter++ }),
        },
      };
    });

    const bulkGetDocs = expectedResults
      .filter(isRight)
      .filter(({ value }) => value.esRequestIndex !== undefined)
      .map(({ value: { object: { type, id } } }) => ({
        _id: this._serializer.generateRawId(namespace, type, id),
        _index: this.getIndexForType(type),
        _source: ['type', 'namespaces'],
      }));
    const bulkGetResponse = bulkGetDocs.length
      ? await this.client.mget(
          {
            body: {
              docs: bulkGetDocs,
            },
          },
          { ignore: [404] }
        )
      : undefined;

    let bulkRequestIndexCounter = 0;
    const bulkCreateParams: object[] = [];
    const expectedBulkResults: Either[] = expectedResults.map((expectedBulkGetResult) => {
      if (isLeft(expectedBulkGetResult)) {
        return expectedBulkGetResult;
      }

      let savedObjectNamespace;
      let savedObjectNamespaces;
      let versionProperties;
      const {
        esRequestIndex,
        object: { version, ...object },
        method,
      } = expectedBulkGetResult.value;
      if (esRequestIndex !== undefined) {
        const indexFound = bulkGetResponse?.statusCode !== 404;
        const actualResult = indexFound ? bulkGetResponse?.body.docs[esRequestIndex] : undefined;
        const docFound = indexFound && actualResult.found === true;
        if (docFound && !this.rawDocExistsInNamespace(actualResult, namespace)) {
          const { id, type } = object;
          return {
            tag: 'Left' as 'Left',
            error: {
              id,
              type,
              error: {
                ...errorContent(SavedObjectsErrorHelpers.createConflictError(type, id)),
                metadata: { isNotOverwritable: true },
              },
            },
          };
        }
        savedObjectNamespaces = getSavedObjectNamespaces(namespace, docFound && actualResult);
        versionProperties = getExpectedVersionProperties(version, actualResult);
      } else {
        if (this._registry.isSingleNamespace(object.type)) {
          savedObjectNamespace = namespace;
        } else if (this._registry.isMultiNamespace(object.type)) {
          savedObjectNamespaces = getSavedObjectNamespaces(namespace);
        }
        versionProperties = getExpectedVersionProperties(version);
      }

      const expectedResult = {
        esRequestIndex: bulkRequestIndexCounter++,
        requestedId: object.id,
        rawMigratedDoc: this._serializer.savedObjectToRaw(
          this._migrator.migrateDocument({
            id: object.id,
            type: object.type,
            attributes: object.attributes,
            migrationVersion: object.migrationVersion,
            ...(savedObjectNamespace && { namespace: savedObjectNamespace }),
            ...(savedObjectNamespaces && { namespaces: savedObjectNamespaces }),
            updated_at: time,
            references: object.references || [],
            originId: object.originId,
          }) as SavedObjectSanitizedDoc
        ),
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

      return { tag: 'Right' as 'Right', value: expectedResult };
    });

    const bulkResponse = bulkCreateParams.length
      ? await this.client.bulk({
          refresh,
          body: bulkCreateParams,
        })
      : undefined;

    return {
      saved_objects: expectedBulkResults.map((expectedResult) => {
        if (isLeft(expectedResult)) {
          return expectedResult.error as any;
        }

        const { requestedId, rawMigratedDoc, esRequestIndex } = expectedResult.value;
        const { error, ...rawResponse } = Object.values(
          bulkResponse?.body.items[esRequestIndex]
        )[0] as any;

        if (error) {
          return {
            id: requestedId,
            type: rawMigratedDoc._source.type,
            error: getBulkOperationError(error, rawMigratedDoc._source.type, requestedId),
          };
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
  }

  /**
   * Check what conflicts will result when creating a given array of saved objects. This includes "unresolvable conflicts", which are
   * multi-namespace objects that exist in a different namespace; such conflicts cannot be resolved/overwritten.
   */
  async checkConflicts(
    objects: SavedObjectsCheckConflictsObject[] = [],
    options: SavedObjectsBaseOptions = {}
  ): Promise<SavedObjectsCheckConflictsResponse> {
    if (objects.length === 0) {
      return { errors: [] };
    }

    const { namespace } = options;

    let bulkGetRequestIndexCounter = 0;
    const expectedBulkGetResults: Either[] = objects.map((object) => {
      const { type, id } = object;

      if (!this._allowedTypes.includes(type)) {
        return {
          tag: 'Left' as 'Left',
          error: {
            id,
            type,
            error: errorContent(SavedObjectsErrorHelpers.createUnsupportedTypeError(type)),
          },
        };
      }

      return {
        tag: 'Right' as 'Right',
        value: {
          type,
          id,
          esRequestIndex: bulkGetRequestIndexCounter++,
        },
      };
    });

    const bulkGetDocs = expectedBulkGetResults.filter(isRight).map(({ value: { type, id } }) => ({
      _id: this._serializer.generateRawId(namespace, type, id),
      _index: this.getIndexForType(type),
      _source: ['type', 'namespaces'],
    }));
    const bulkGetResponse = bulkGetDocs.length
      ? await this.client.mget(
          {
            body: {
              docs: bulkGetDocs,
            },
          },
          { ignore: [404] }
        )
      : undefined;

    const errors: SavedObjectsCheckConflictsResponse['errors'] = [];
    expectedBulkGetResults.forEach((expectedResult) => {
      if (isLeft(expectedResult)) {
        errors.push(expectedResult.error as any);
        return;
      }

      const { type, id, esRequestIndex } = expectedResult.value;
      const doc = bulkGetResponse?.body.docs[esRequestIndex];
      if (doc.found) {
        errors.push({
          id,
          type,
          error: {
            ...errorContent(SavedObjectsErrorHelpers.createConflictError(type, id)),
            ...(!this.rawDocExistsInNamespace(doc, namespace) && {
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
    if (!this._allowedTypes.includes(type)) {
      throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
    }

    const { namespace, refresh = DEFAULT_REFRESH_SETTING } = options;

    const rawId = this._serializer.generateRawId(namespace, type, id);
    let preflightResult: SavedObjectsRawDoc | undefined;

    if (this._registry.isMultiNamespace(type)) {
      preflightResult = await this.preflightCheckIncludesNamespace(type, id, namespace);
      const existingNamespaces = getSavedObjectNamespaces(undefined, preflightResult);
      const remainingNamespaces = existingNamespaces?.filter(
        (x) => x !== getNamespaceString(namespace)
      );

      if (remainingNamespaces?.length) {
        // if there is 1 or more namespace remaining, update the saved object
        const time = this._getCurrentTime();

        const doc = {
          updated_at: time,
          namespaces: remainingNamespaces,
        };

        const { statusCode } = await this.client.update(
          {
            id: rawId,
            index: this.getIndexForType(type),
            ...getExpectedVersionProperties(undefined, preflightResult),
            refresh,
            body: {
              doc,
            },
          },
          { ignore: [404] }
        );

        if (statusCode === 404) {
          // see "404s from missing index" above
          throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
        }
        return {};
      }
    }

    const { body, statusCode } = await this.client.delete<DeleteDocumentResponse>(
      {
        id: rawId,
        index: this.getIndexForType(type),
        ...getExpectedVersionProperties(undefined, preflightResult),
        refresh,
      },
      { ignore: [404] }
    );

    const deleted = body.result === 'deleted';
    if (deleted) {
      return {};
    }

    const deleteDocNotFound = body.result === 'not_found';
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
    if (!namespace || typeof namespace !== 'string') {
      throw new TypeError(`namespace is required, and must be a string`);
    }

    const allTypes = Object.keys(getRootPropertiesObjects(this._mappings));
    const typesToUpdate = allTypes.filter((type) => !this._registry.isNamespaceAgnostic(type));

    const { body } = await this.client.updateByQuery(
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
            params: { namespace: getNamespaceString(namespace) },
          },
          conflicts: 'proceed',
          ...getSearchDsl(this._mappings, this._registry, {
            namespaces: namespace ? [namespace] : undefined,
            type: typesToUpdate,
          }),
        },
      },
      { ignore: [404] }
    );

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
   * @property {string} [options.sortField]
   * @property {string} [options.sortOrder]
   * @property {Array<string>} [options.fields]
   * @property {string} [options.namespace]
   * @property {object} [options.hasReference] - { type, id }
   * @property {string} [options.preference]
   * @returns {promise} - { saved_objects: [{ id, type, version, attributes }], total, per_page, page }
   */
  async find<T = unknown>({
    search,
    defaultSearchOperator = 'OR',
    searchFields,
    rootSearchFields,
    hasReference,
    page = 1,
    perPage = 20,
    sortField,
    sortOrder,
    fields,
    namespaces,
    type,
    filter,
    preference,
  }: SavedObjectsFindOptions): Promise<SavedObjectsFindResponse<T>> {
    if (!type) {
      throw SavedObjectsErrorHelpers.createBadRequestError(
        'options.type must be a string or an array of strings'
      );
    }

    const types = Array.isArray(type) ? type : [type];
    const allowedTypes = types.filter((t) => this._allowedTypes.includes(t));
    if (allowedTypes.length === 0) {
      return {
        page,
        per_page: perPage,
        total: 0,
        saved_objects: [],
      };
    }

    if (searchFields && !Array.isArray(searchFields)) {
      throw SavedObjectsErrorHelpers.createBadRequestError('options.searchFields must be an array');
    }

    if (fields && !Array.isArray(fields)) {
      throw SavedObjectsErrorHelpers.createBadRequestError('options.fields must be an array');
    }

    let kueryNode;

    try {
      if (filter) {
        kueryNode = validateConvertFilterToKueryNode(allowedTypes, filter, this._mappings);
      }
    } catch (e) {
      if (e.name === 'KQLSyntaxError') {
        throw SavedObjectsErrorHelpers.createBadRequestError('KQLSyntaxError: ' + e.message);
      } else {
        throw e;
      }
    }

    const esOptions = {
      index: this.getIndicesForTypes(allowedTypes),
      size: perPage,
      from: perPage * (page - 1),
      _source: includedFields(type, fields),
      rest_total_hits_as_int: true,
      preference,
      body: {
        seq_no_primary_term: true,
        ...getSearchDsl(this._mappings, this._registry, {
          search,
          defaultSearchOperator,
          searchFields,
          rootSearchFields,
          type: allowedTypes,
          sortField,
          sortOrder,
          namespaces,
          hasReference,
          kueryNode,
        }),
      },
    };

    const { body, statusCode } = await this.client.search<SearchResponse<any>>(esOptions, {
      ignore: [404],
    });
    if (statusCode === 404) {
      // 404 is only possible here if the index is missing, which
      // we don't want to leak, see "404s from missing index" above
      return {
        page,
        per_page: perPage,
        total: 0,
        saved_objects: [],
      };
    }

    return {
      page,
      per_page: perPage,
      total: body.hits.total,
      saved_objects: body.hits.hits.map(
        (hit: SavedObjectsRawDoc): SavedObjectsFindResult => ({
          ...this._rawToSavedObject(hit),
          score: (hit as any)._score,
        })
      ),
    } as SavedObjectsFindResponse<T>;
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
    const { namespace } = options;

    if (objects.length === 0) {
      return { saved_objects: [] };
    }

    let bulkGetRequestIndexCounter = 0;
    const expectedBulkGetResults: Either[] = objects.map((object) => {
      const { type, id, fields } = object;

      if (!this._allowedTypes.includes(type)) {
        return {
          tag: 'Left' as 'Left',
          error: {
            id,
            type,
            error: errorContent(SavedObjectsErrorHelpers.createUnsupportedTypeError(type)),
          },
        };
      }

      return {
        tag: 'Right' as 'Right',
        value: {
          type,
          id,
          fields,
          esRequestIndex: bulkGetRequestIndexCounter++,
        },
      };
    });

    const bulkGetDocs = expectedBulkGetResults
      .filter(isRight)
      .map(({ value: { type, id, fields } }) => ({
        _id: this._serializer.generateRawId(namespace, type, id),
        _index: this.getIndexForType(type),
        _source: includedFields(type, fields),
      }));
    const bulkGetResponse = bulkGetDocs.length
      ? await this.client.mget(
          {
            body: {
              docs: bulkGetDocs,
            },
          },
          { ignore: [404] }
        )
      : undefined;

    return {
      saved_objects: expectedBulkGetResults.map((expectedResult) => {
        if (isLeft(expectedResult)) {
          return expectedResult.error as any;
        }

        const { type, id, esRequestIndex } = expectedResult.value;
        const doc = bulkGetResponse?.body.docs[esRequestIndex];

        if (!doc.found || !this.rawDocExistsInNamespace(doc, namespace)) {
          return ({
            id,
            type,
            error: errorContent(SavedObjectsErrorHelpers.createGenericNotFoundError(type, id)),
          } as any) as SavedObject<T>;
        }

        const { originId, updated_at: updatedAt } = doc._source;
        let namespaces = [];
        if (!this._registry.isNamespaceAgnostic(type)) {
          namespaces = doc._source.namespaces ?? [getNamespaceString(doc._source.namespace)];
        }

        return {
          id,
          type,
          namespaces,
          ...(originId && { originId }),
          ...(updatedAt && { updated_at: updatedAt }),
          version: encodeHitVersion(doc),
          attributes: doc._source[type],
          references: doc._source.references || [],
          migrationVersion: doc._source.migrationVersion,
        };
      }),
    };
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
    if (!this._allowedTypes.includes(type)) {
      throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
    }

    const { namespace } = options;

    const { body, statusCode } = await this.client.get<GetResponse<SavedObjectsRawDocSource>>(
      {
        id: this._serializer.generateRawId(namespace, type, id),
        index: this.getIndexForType(type),
      },
      { ignore: [404] }
    );

    const docNotFound = body.found === false;
    const indexNotFound = statusCode === 404;
    if (docNotFound || indexNotFound || !this.rawDocExistsInNamespace(body, namespace)) {
      // see "404s from missing index" above
      throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
    }

    const { originId, updated_at: updatedAt } = body._source;

    let namespaces: string[] = [];
    if (!this._registry.isNamespaceAgnostic(type)) {
      namespaces = body._source.namespaces ?? [getNamespaceString(body._source.namespace)];
    }

    return {
      id,
      type,
      namespaces,
      ...(originId && { originId }),
      ...(updatedAt && { updated_at: updatedAt }),
      version: encodeHitVersion(body),
      attributes: body._source[type],
      references: body._source.references || [],
      migrationVersion: body._source.migrationVersion,
    };
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
    options: SavedObjectsUpdateOptions = {}
  ): Promise<SavedObjectsUpdateResponse<T>> {
    if (!this._allowedTypes.includes(type)) {
      throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
    }

    const { version, namespace, references, refresh = DEFAULT_REFRESH_SETTING } = options;

    let preflightResult: SavedObjectsRawDoc | undefined;
    if (this._registry.isMultiNamespace(type)) {
      preflightResult = await this.preflightCheckIncludesNamespace(type, id, namespace);
    }

    const time = this._getCurrentTime();

    const doc = {
      [type]: attributes,
      updated_at: time,
      ...(Array.isArray(references) && { references }),
    };

    const { body, statusCode } = await this.client.update(
      {
        id: this._serializer.generateRawId(namespace, type, id),
        index: this.getIndexForType(type),
        ...getExpectedVersionProperties(version, preflightResult),
        refresh,

        body: {
          doc,
        },
        _source_includes: ['namespace', 'namespaces', 'originId'],
      },
      { ignore: [404] }
    );

    if (statusCode === 404) {
      // see "404s from missing index" above
      throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
    }

    const { originId } = body.get._source;
    let namespaces = [];
    if (!this._registry.isNamespaceAgnostic(type)) {
      namespaces = body.get._source.namespaces ?? [getNamespaceString(body.get._source.namespace)];
    }

    return {
      id,
      type,
      updated_at: time,
      // @ts-expect-error update doesn't have _seq_no, _primary_term as Record<string, any> / any in LP
      version: encodeHitVersion(body),
      namespaces,
      ...(originId && { originId }),
      references,
      attributes,
    };
  }

  /**
   * Adds one or more namespaces to a given multi-namespace saved object. This method and
   * [`deleteFromNamespaces`]{@link SavedObjectsRepository.deleteFromNamespaces} are the only ways to change which Spaces a multi-namespace
   * saved object is shared to.
   */
  async addToNamespaces(
    type: string,
    id: string,
    namespaces: string[],
    options: SavedObjectsAddToNamespacesOptions = {}
  ): Promise<SavedObjectsAddToNamespacesResponse> {
    if (!this._allowedTypes.includes(type)) {
      throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
    }

    if (!this._registry.isMultiNamespace(type)) {
      throw SavedObjectsErrorHelpers.createBadRequestError(
        `${type} doesn't support multiple namespaces`
      );
    }

    if (!namespaces.length) {
      throw SavedObjectsErrorHelpers.createBadRequestError(
        'namespaces must be a non-empty array of strings'
      );
    }

    const { version, namespace, refresh = DEFAULT_REFRESH_SETTING } = options;

    const rawId = this._serializer.generateRawId(undefined, type, id);
    const preflightResult = await this.preflightCheckIncludesNamespace(type, id, namespace);
    const existingNamespaces = getSavedObjectNamespaces(undefined, preflightResult);
    // there should never be a case where a multi-namespace object does not have any existing namespaces
    // however, it is a possibility if someone manually modifies the document in Elasticsearch
    const time = this._getCurrentTime();

    const doc = {
      updated_at: time,
      namespaces: existingNamespaces ? unique(existingNamespaces.concat(namespaces)) : namespaces,
    };

    const { statusCode } = await this.client.update(
      {
        id: rawId,
        index: this.getIndexForType(type),
        ...getExpectedVersionProperties(version, preflightResult),
        refresh,
        body: {
          doc,
        },
      },
      { ignore: [404] }
    );

    if (statusCode === 404) {
      // see "404s from missing index" above
      throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
    }

    return { namespaces: doc.namespaces };
  }

  /**
   * Removes one or more namespaces from a given multi-namespace saved object. If no namespaces remain, the saved object is deleted
   * entirely. This method and [`addToNamespaces`]{@link SavedObjectsRepository.addToNamespaces} are the only ways to change which Spaces a
   * multi-namespace saved object is shared to.
   */
  async deleteFromNamespaces(
    type: string,
    id: string,
    namespaces: string[],
    options: SavedObjectsDeleteFromNamespacesOptions = {}
  ): Promise<SavedObjectsDeleteFromNamespacesResponse> {
    if (!this._allowedTypes.includes(type)) {
      throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
    }

    if (!this._registry.isMultiNamespace(type)) {
      throw SavedObjectsErrorHelpers.createBadRequestError(
        `${type} doesn't support multiple namespaces`
      );
    }

    if (!namespaces.length) {
      throw SavedObjectsErrorHelpers.createBadRequestError(
        'namespaces must be a non-empty array of strings'
      );
    }

    const { namespace, refresh = DEFAULT_REFRESH_SETTING } = options;

    const rawId = this._serializer.generateRawId(undefined, type, id);
    const preflightResult = await this.preflightCheckIncludesNamespace(type, id, namespace);
    const existingNamespaces = getSavedObjectNamespaces(undefined, preflightResult);
    // if there are somehow no existing namespaces, allow the operation to proceed and delete this saved object
    const remainingNamespaces = existingNamespaces?.filter((x) => !namespaces.includes(x));

    if (remainingNamespaces?.length) {
      // if there is 1 or more namespace remaining, update the saved object
      const time = this._getCurrentTime();

      const doc = {
        updated_at: time,
        namespaces: remainingNamespaces,
      };

      const { statusCode } = await this.client.update(
        {
          id: rawId,
          index: this.getIndexForType(type),
          ...getExpectedVersionProperties(undefined, preflightResult),
          refresh,

          body: {
            doc,
          },
        },
        {
          ignore: [404],
        }
      );

      if (statusCode === 404) {
        // see "404s from missing index" above
        throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
      }
      return { namespaces: doc.namespaces };
    } else {
      // if there are no namespaces remaining, delete the saved object
      const { body, statusCode } = await this.client.delete<DeleteDocumentResponse>(
        {
          id: this._serializer.generateRawId(undefined, type, id),
          refresh,
          ...getExpectedVersionProperties(undefined, preflightResult),
          index: this.getIndexForType(type),
        },
        {
          ignore: [404],
        }
      );

      const deleted = body.result === 'deleted';
      if (deleted) {
        return { namespaces: [] };
      }

      const deleteDocNotFound = body.result === 'not_found';
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
    const time = this._getCurrentTime();
    const { namespace } = options;

    let bulkGetRequestIndexCounter = 0;
    const expectedBulkGetResults: Either[] = objects.map((object) => {
      const { type, id } = object;

      if (!this._allowedTypes.includes(type)) {
        return {
          tag: 'Left' as 'Left',
          error: {
            id,
            type,
            error: errorContent(SavedObjectsErrorHelpers.createGenericNotFoundError(type, id)),
          },
        };
      }

      const { attributes, references, version } = object;

      const documentToSave = {
        [type]: attributes,
        updated_at: time,
        ...(Array.isArray(references) && { references }),
      };

      const requiresNamespacesCheck = this._registry.isMultiNamespace(object.type);

      return {
        tag: 'Right' as 'Right',
        value: {
          type,
          id,
          version,
          documentToSave,
          ...(requiresNamespacesCheck && { esRequestIndex: bulkGetRequestIndexCounter++ }),
        },
      };
    });

    const bulkGetDocs = expectedBulkGetResults
      .filter(isRight)
      .filter(({ value }) => value.esRequestIndex !== undefined)
      .map(({ value: { type, id } }) => ({
        _id: this._serializer.generateRawId(namespace, type, id),
        _index: this.getIndexForType(type),
        _source: ['type', 'namespaces'],
      }));
    const bulkGetResponse = bulkGetDocs.length
      ? await this.client.mget(
          {
            body: {
              docs: bulkGetDocs,
            },
          },
          {
            ignore: [404],
          }
        )
      : undefined;

    let bulkUpdateRequestIndexCounter = 0;
    const bulkUpdateParams: object[] = [];
    const expectedBulkUpdateResults: Either[] = expectedBulkGetResults.map(
      (expectedBulkGetResult) => {
        if (isLeft(expectedBulkGetResult)) {
          return expectedBulkGetResult;
        }

        const { esRequestIndex, id, type, version, documentToSave } = expectedBulkGetResult.value;
        let namespaces;
        let versionProperties;
        if (esRequestIndex !== undefined) {
          const indexFound = bulkGetResponse?.statusCode !== 404;
          const actualResult = indexFound ? bulkGetResponse?.body.docs[esRequestIndex] : undefined;
          const docFound = indexFound && actualResult.found === true;
          if (!docFound || !this.rawDocExistsInNamespace(actualResult, namespace)) {
            return {
              tag: 'Left' as 'Left',
              error: {
                id,
                type,
                error: errorContent(SavedObjectsErrorHelpers.createGenericNotFoundError(type, id)),
              },
            };
          }
          namespaces = actualResult._source.namespaces ?? [
            getNamespaceString(actualResult._source.namespace),
          ];
          versionProperties = getExpectedVersionProperties(version, actualResult);
        } else {
          if (this._registry.isSingleNamespace(type)) {
            namespaces = [getNamespaceString(namespace)];
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
              _id: this._serializer.generateRawId(namespace, type, id),
              _index: this.getIndexForType(type),
              ...versionProperties,
            },
          },
          { doc: documentToSave }
        );

        return { tag: 'Right' as 'Right', value: expectedResult };
      }
    );

    const { refresh = DEFAULT_REFRESH_SETTING } = options;
    const bulkUpdateResponse = bulkUpdateParams.length
      ? await this.client.bulk({
          refresh,
          body: bulkUpdateParams,
          _source_includes: ['originId'],
        })
      : undefined;

    return {
      saved_objects: expectedBulkUpdateResults.map((expectedResult) => {
        if (isLeft(expectedResult)) {
          return expectedResult.error as any;
        }

        const { type, id, namespaces, documentToSave, esRequestIndex } = expectedResult.value;
        const response = bulkUpdateResponse?.body.items[esRequestIndex];
        // When a bulk update operation is completed, any fields specified in `_sourceIncludes` will be found in the "get" value of the
        // returned object. We need to retrieve the `originId` if it exists so we can return it to the consumer.
        const { error, _seq_no: seqNo, _primary_term: primaryTerm, get } = Object.values(
          response
        )[0] as any;

        // eslint-disable-next-line @typescript-eslint/naming-convention
        const { [type]: attributes, references, updated_at } = documentToSave;
        if (error) {
          return {
            id,
            type,
            error: getBulkOperationError(error, type, id),
          };
        }

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
  }

  /**
   * Increases a counter field by one. Creates the document if one doesn't exist for the given id.
   *
   * @param {string} type
   * @param {string} id
   * @param {string} counterFieldName
   * @param {object} [options={}]
   * @property {object} [options.migrationVersion=undefined]
   * @returns {promise}
   */
  async incrementCounter(
    type: string,
    id: string,
    counterFieldName: string,
    options: SavedObjectsIncrementCounterOptions = {}
  ): Promise<SavedObject> {
    if (typeof type !== 'string') {
      throw new Error('"type" argument must be a string');
    }
    if (typeof counterFieldName !== 'string') {
      throw new Error('"counterFieldName" argument must be a string');
    }
    if (!this._allowedTypes.includes(type)) {
      throw SavedObjectsErrorHelpers.createUnsupportedTypeError(type);
    }

    const { migrationVersion, namespace, refresh = DEFAULT_REFRESH_SETTING } = options;

    const time = this._getCurrentTime();
    let savedObjectNamespace;
    let savedObjectNamespaces: string[] | undefined;

    if (this._registry.isSingleNamespace(type) && namespace) {
      savedObjectNamespace = namespace;
    } else if (this._registry.isMultiNamespace(type)) {
      savedObjectNamespaces = await this.preflightGetNamespaces(type, id, namespace);
    }

    const migrated = this._migrator.migrateDocument({
      id,
      type,
      ...(savedObjectNamespace && { namespace: savedObjectNamespace }),
      ...(savedObjectNamespaces && { namespaces: savedObjectNamespaces }),
      attributes: { [counterFieldName]: 1 },
      migrationVersion,
      updated_at: time,
    });

    const raw = this._serializer.savedObjectToRaw(migrated as SavedObjectSanitizedDoc);

    const { body } = await this.client.update({
      id: raw._id,
      index: this.getIndexForType(type),
      refresh,
      _source: 'true',
      body: {
        script: {
          source: `
              if (ctx._source[params.type][params.counterFieldName] == null) {
                ctx._source[params.type][params.counterFieldName] = params.count;
              }
              else {
                ctx._source[params.type][params.counterFieldName] += params.count;
              }
              ctx._source.updated_at = params.time;
            `,
          lang: 'painless',
          params: {
            count: 1,
            time,
            type,
            counterFieldName,
          },
        },
        upsert: raw._source,
      },
    });

    const { originId } = body.get._source;
    return {
      id,
      type,
      ...(savedObjectNamespaces && { namespaces: savedObjectNamespaces }),
      ...(originId && { originId }),
      updated_at: time,
      references: body.get._source.references,
      // @ts-expect-error
      version: encodeHitVersion(body),
      attributes: body.get._source[type],
    };
  }

  /**
   * Returns index specified by the given type or the default index
   *
   * @param type - the type
   */
  private getIndexForType(type: string) {
    return this._registry.getIndex(type) || this._index;
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

  private _getCurrentTime() {
    return new Date().toISOString();
  }

  private _rawToSavedObject<T = unknown>(raw: SavedObjectsRawDoc): SavedObject<T> {
    const savedObject = this._serializer.rawToSavedObject(raw);
    const { namespace, type } = savedObject;
    if (this._registry.isSingleNamespace(type)) {
      savedObject.namespaces = [getNamespaceString(namespace)];
    }
    return omit(savedObject, 'namespace') as SavedObject<T>;
  }

  /**
   * Check to ensure that a raw document exists in a namespace. If the document is not a multi-namespace type, then this returns `true` as
   * we rely on the guarantees of the document ID format. If the document is a multi-namespace type, this checks to ensure that the
   * document's `namespaces` value includes the string representation of the given namespace.
   *
   * WARNING: This should only be used for documents that were retrieved from Elasticsearch. Otherwise, the guarantees of the document ID
   * format mentioned above do not apply.
   */
  private rawDocExistsInNamespace(raw: SavedObjectsRawDoc, namespace?: string) {
    const rawDocType = raw._source.type;

    // if the type is namespace isolated, or namespace agnostic, we can continue to rely on the guarantees
    // of the document ID format and don't need to check this
    if (!this._registry.isMultiNamespace(rawDocType)) {
      return true;
    }

    const namespaces = raw._source.namespaces;
    return namespaces?.includes(getNamespaceString(namespace)) ?? false;
  }

  /**
   * Pre-flight check to get a multi-namespace saved object's included namespaces. This ensures that, if the saved object exists, it
   * includes the target namespace.
   *
   * @param type The type of the saved object.
   * @param id The ID of the saved object.
   * @param namespace The target namespace.
   * @returns Array of namespaces that this saved object currently includes, or (if the object does not exist yet) the namespaces that a
   * newly-created object will include. Value may be undefined if an existing saved object has no namespaces attribute; this should not
   * happen in normal operations, but it is possible if the Elasticsearch document is manually modified.
   * @throws Will throw an error if the saved object exists and it does not include the target namespace.
   */
  private async preflightGetNamespaces(type: string, id: string, namespace?: string) {
    if (!this._registry.isMultiNamespace(type)) {
      throw new Error(`Cannot make preflight get request for non-multi-namespace type '${type}'.`);
    }

    const { body, statusCode } = await this.client.get<GetResponse<SavedObjectsRawDocSource>>(
      {
        id: this._serializer.generateRawId(undefined, type, id),
        index: this.getIndexForType(type),
      },
      {
        ignore: [404],
      }
    );

    const indexFound = statusCode !== 404;
    const docFound = indexFound && body.found === true;
    if (docFound) {
      if (!this.rawDocExistsInNamespace(body, namespace)) {
        throw SavedObjectsErrorHelpers.createConflictError(type, id);
      }
      return getSavedObjectNamespaces(namespace, body);
    }
    return getSavedObjectNamespaces(namespace);
  }

  /**
   * Pre-flight check for a multi-namespace saved object's namespaces. This ensures that, if the saved object exists, it includes the target
   * namespace.
   *
   * @param type The type of the saved object.
   * @param id The ID of the saved object.
   * @param namespace The target namespace.
   * @returns Raw document from Elasticsearch.
   * @throws Will throw an error if the saved object is not found, or if it doesn't include the target namespace.
   */
  private async preflightCheckIncludesNamespace(type: string, id: string, namespace?: string) {
    if (!this._registry.isMultiNamespace(type)) {
      throw new Error(`Cannot make preflight get request for non-multi-namespace type '${type}'.`);
    }

    const rawId = this._serializer.generateRawId(undefined, type, id);
    const { body, statusCode } = await this.client.get<GetResponse<SavedObjectsRawDocSource>>(
      {
        id: rawId,
        index: this.getIndexForType(type),
      },
      { ignore: [404] }
    );

    const indexFound = statusCode !== 404;
    const docFound = indexFound && body.found === true;
    if (!docFound || !this.rawDocExistsInNamespace(body, namespace)) {
      throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
    }
    return body as SavedObjectsRawDoc;
  }
}

function getBulkOperationError(error: { type: string; reason?: string }, type: string, id: string) {
  switch (error.type) {
    case 'version_conflict_engine_exception':
      return errorContent(SavedObjectsErrorHelpers.createConflictError(type, id));
    case 'document_missing_exception':
      return errorContent(SavedObjectsErrorHelpers.createGenericNotFoundError(type, id));
    default:
      return {
        message: error.reason || JSON.stringify(error),
      };
  }
}

/**
 * Returns an object with the expected version properties. This facilitates Elasticsearch's Optimistic Concurrency Control.
 *
 * @param version Optional version specified by the consumer.
 * @param document Optional existing document that was obtained in a preflight operation.
 */
function getExpectedVersionProperties(version?: string, document?: SavedObjectsRawDoc) {
  if (version) {
    return decodeRequestVersion(version);
  } else if (document) {
    return {
      if_seq_no: document._seq_no,
      if_primary_term: document._primary_term,
    };
  }
  return {};
}

/**
 * Returns the string representation of a namespace.
 * The default namespace is undefined, and is represented by the string 'default'.
 */
function getNamespaceString(namespace?: string) {
  return namespace ?? 'default';
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
  return [getNamespaceString(namespace)];
}

/**
 * Extracts the contents of a decorated error to return the attributes for bulk operations.
 */
const errorContent = (error: DecoratedError) => error.output.payload;

const unique = (array: string[]) => [...new Set(array)];
