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
import { retryCallCluster } from '../../../elasticsearch/retry_call_cluster';
import { APICaller } from '../../../elasticsearch/';

import { getRootPropertiesObjects, IndexMapping } from '../../mappings';
import { getSearchDsl } from './search_dsl';
import { includedFields } from './included_fields';
import { decorateEsError } from './decorate_es_error';
import { SavedObjectsErrorHelpers } from './errors';
import { decodeRequestVersion, encodeVersion, encodeHitVersion } from '../../version';
import { SavedObjectsSchema } from '../../schema';
import { KibanaMigrator } from '../../migrations';
import { SavedObjectsSerializer, SanitizedSavedObjectDoc, RawDoc } from '../../serialization';
import {
  SavedObjectsBulkCreateObject,
  SavedObjectsBulkGetObject,
  SavedObjectsBulkResponse,
  SavedObjectsBulkUpdateResponse,
  SavedObjectsCreateOptions,
  SavedObjectsFindResponse,
  SavedObjectsUpdateOptions,
  SavedObjectsUpdateResponse,
  SavedObjectsBulkUpdateObject,
  SavedObjectsBulkUpdateOptions,
  SavedObjectsDeleteOptions,
  SavedObjectsDeleteByNamespaceOptions,
  SavedObjectsUpdateNamespacesOptions,
} from '../saved_objects_client';
import {
  SavedObject,
  SavedObjectAttributes,
  SavedObjectsBaseOptions,
  SavedObjectsFindOptions,
  SavedObjectsMigrationVersion,
  MutatingOperationRefreshSetting,
} from '../../types';
import { validateConvertFilterToKueryNode } from './filter_utils';
import { LegacyConfig } from '../../../legacy/config';

// BEWARE: The SavedObjectClient depends on the implementation details of the SavedObjectsRepository
// so any breaking changes to this repository are considered breaking changes to the SavedObjectsClient.

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type Left<T> = {
  tag: 'Left';
  error: T;
};
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type Right<T> = {
  tag: 'Right';
  value: T;
};

type Either<L, R> = Left<L> | Right<R>;
const isLeft = <L, R>(either: Either<L, R>): either is Left<L> => {
  return either.tag === 'Left';
};

export interface SavedObjectsRepositoryOptions {
  index: string;
  /** @deprecated Will be removed once SavedObjectsSchema is exposed from Core */
  config: LegacyConfig;
  mappings: IndexMapping;
  callCluster: APICaller;
  schema: SavedObjectsSchema;
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
  /** The Elasticsearch Refresh setting for this operation */
  refresh?: MutatingOperationRefreshSetting;
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
  private _config: LegacyConfig;
  private _mappings: IndexMapping;
  private _schema: SavedObjectsSchema;
  private _allowedTypes: string[];
  private _unwrappedCallCluster: APICaller;
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
    schema: SavedObjectsSchema,
    config: LegacyConfig,
    indexName: string,
    callCluster: APICaller,
    extraTypes: string[] = [],
    injectedConstructor: any = SavedObjectsRepository
  ) {
    const mappings = migrator.getActiveMappings();
    const allTypes = Object.keys(getRootPropertiesObjects(mappings));
    const serializer = new SavedObjectsSerializer(schema);
    const visibleTypes = allTypes.filter(type => !schema.isHiddenType(type));

    const missingTypeMappings = extraTypes.filter(type => !allTypes.includes(type));
    if (missingTypeMappings.length > 0) {
      throw new Error(
        `Missing mappings for saved objects types: '${missingTypeMappings.join(', ')}'`
      );
    }

    const allowedTypes = [...new Set(visibleTypes.concat(extraTypes))];

    return new injectedConstructor({
      index: indexName,
      config,
      migrator,
      mappings,
      schema,
      serializer,
      allowedTypes,
      callCluster: retryCallCluster(callCluster),
    });
  }

  private constructor(options: SavedObjectsRepositoryOptions) {
    const {
      index,
      config,
      mappings,
      callCluster,
      schema,
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
    this._config = config;
    this._mappings = mappings;
    this._schema = schema;
    if (allowedTypes.length === 0) {
      throw new Error('Empty or missing types for saved object repository!');
    }
    this._allowedTypes = allowedTypes;

    this._unwrappedCallCluster = async (...args: Parameters<APICaller>) => {
      await migrator.runMigrations();
      return callCluster(...args);
    };
    this._schema = schema;
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
  public async create<T extends SavedObjectAttributes>(
    type: string,
    attributes: T,
    options: SavedObjectsCreateOptions = {}
  ): Promise<SavedObject<T>> {
    const {
      id,
      migrationVersion,
      overwrite = false,
      references = [],
      refresh = DEFAULT_REFRESH_SETTING,
    } = options;

    if (!this._allowedTypes.includes(type)) {
      throw SavedObjectsErrorHelpers.createUnsupportedTypeError(type);
    }

    // This used to be using `method = id && !overwrite ? 'create' : 'index'`;
    // This meant that when we were generating the IDs ourselves using uuid.v1(), that if
    // there was a conflict for some reason, we'd be hiding it and not throwing a Conflict.
    // We can leave it the old way, it just feels wrong because now we could potentially
    // be overwriting a saved-object which exists in another namespace
    //
    // ID      |   overwrite | old operation | new operation
    // null        true        index           create
    // null        false       index           create
    // something   true        index           index
    // something   false       create          create
    const method = id && overwrite ? 'index' : 'create';
    const time = this._getCurrentTime();
    let savedObjectNamespace;
    let savedObjectNamespaces;

    if (this._schema.isNamespace(type) && options.namespace) {
      savedObjectNamespace = options.namespace;
    } else if (this._schema.isNamespaces(type)) {
      if (method === 'index') {
        const response = await this._callCluster('get', {
          id: this._serializer.generateRawId(undefined, type, id),
          index: this.getIndexForType(type),
          ignore: [404],
        });

        const docFound = response.found === true;
        const indexFound = response.status !== 404;
        if (docFound && indexFound && !this._rawInNamespaces(response, options.namespace)) {
          throw SavedObjectsErrorHelpers.createConflictError(type, id!);
        }
        savedObjectNamespaces = docFound
          ? response._source.namespaces
          : [options.namespace === undefined ? 'default' : options.namespace];
      } else {
        savedObjectNamespaces = [options.namespace === undefined ? 'default' : options.namespace];
      }
    }

    try {
      const migrated = this._migrator.migrateDocument({
        id,
        type,
        ...(savedObjectNamespace && { namespace: savedObjectNamespace }),
        ...(savedObjectNamespaces && { namespaces: savedObjectNamespaces }),
        attributes,
        migrationVersion,
        updated_at: time,
        references,
      });

      const raw = this._serializer.savedObjectToRaw(migrated as SanitizedSavedObjectDoc);

      const response = await this._writeToCluster(method, {
        id: raw._id,
        index: this.getIndexForType(type),
        refresh,
        body: raw._source,
      });

      return this._rawToSavedObject({
        ...raw,
        ...response,
      });
    } catch (error) {
      if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
        // See "503s from missing index" above
        throw SavedObjectsErrorHelpers.createEsAutoCreateIndexError();
      }

      throw error;
    }
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
  async bulkCreate<T extends SavedObjectAttributes = any>(
    objects: Array<SavedObjectsBulkCreateObject<T>>,
    options: SavedObjectsCreateOptions = {}
  ): Promise<SavedObjectsBulkResponse<T>> {
    const { namespace, overwrite = false, refresh = DEFAULT_REFRESH_SETTING } = options;
    const time = this._getCurrentTime();

    let bulkGetRequestIndexCounter = 0;
    const bulkGetDocs: object[] = [];
    const expectedBulkGetResults: Array<Either<any, any>> = objects.map(object => {
      if (!this._allowedTypes.includes(object.type)) {
        return {
          tag: 'Left' as 'Left',
          error: {
            id: object.id,
            type: object.type,
            error: SavedObjectsErrorHelpers.createUnsupportedTypeError(object.type).output.payload,
          },
        };
      }

      // This used to be using `method = object.id && !overwrite ? 'create' : 'index'`;
      // This meant that when we were generating the IDs ourselves using uuid.v1(), that if
      // there was a conflict for some reason, we'd be hiding it and not throwing a Conflict.
      // We can leave it the old way, it just feels wrong because now we could potentially
      // be overwriting a saved-object which exists in another namespace
      //
      // ID      |   overwrite | old operation | new operation
      // null        true        index           create
      // null        false       index           create
      // something   true        index           index
      // something   false       create          create
      const method = object.id && overwrite ? 'index' : 'create';
      if (method === 'create' || !this._schema.isNamespaces(object.type)) {
        return {
          tag: 'Right' as 'Right',
          value: {
            method,
            object,
          },
        };
      }

      bulkGetDocs.push({
        _id: this._serializer.generateRawId(namespace, object.type, object.id),
        _index: this.getIndexForType(object.type),
        _source: ['type', 'namespaces'],
      });

      return {
        tag: 'Right' as 'Right',
        value: {
          esRequestIndex: bulkGetRequestIndexCounter++,
          method,
          object,
        },
      };
    });

    const bulkGetResponse = bulkGetDocs.length
      ? await this._callCluster('mget', {
          body: {
            docs: bulkGetDocs,
          },
          ignore: [404],
        })
      : undefined;

    let bulkRequestIndexCounter = 0;
    const bulkCreateParams: object[] = [];
    const expectedBulkResults: Array<Either<any, any>> = expectedBulkGetResults.map(
      expectedBulkGetResult => {
        if (isLeft(expectedBulkGetResult)) {
          return expectedBulkGetResult;
        }

        let savedObjectNamespace;
        let savedObjectNamespaces;
        const { esRequestIndex, object, method } = expectedBulkGetResult.value;
        if (esRequestIndex !== undefined) {
          const indexFound = bulkGetResponse.status !== 404;
          const actualResult = indexFound ? bulkGetResponse.docs[esRequestIndex] : undefined;
          const docFound = indexFound && actualResult.found === true;
          if (indexFound && docFound && !this._rawInNamespaces(actualResult, namespace)) {
            const { id, type } = object;
            return {
              tag: 'Left' as 'Left',
              error: {
                id,
                type,
                error: SavedObjectsErrorHelpers.createConflictError(type, id).output.payload,
              },
            };
          }
          savedObjectNamespaces = docFound
            ? actualResult._source.namespaces
            : [namespace === undefined ? 'default' : namespace];
        } else {
          if (this._schema.isNamespace(object.type)) {
            savedObjectNamespace = namespace;
          } else if (this._schema.isNamespaces(object.type)) {
            savedObjectNamespaces = [namespace === undefined ? 'default' : namespace];
          }
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
            }) as SanitizedSavedObjectDoc
          ),
        };

        bulkCreateParams.push(
          {
            [method]: {
              _id: expectedResult.rawMigratedDoc._id,
              _index: this.getIndexForType(object.type),
            },
          },
          expectedResult.rawMigratedDoc._source
        );

        return { tag: 'Right' as 'Right', value: expectedResult };
      }
    );

    const bulkResponse = bulkCreateParams.length
      ? await this._writeToCluster('bulk', {
          refresh,
          body: bulkCreateParams,
        })
      : undefined;

    return {
      saved_objects: expectedBulkResults.map(expectedResult => {
        if (isLeft(expectedResult)) {
          return expectedResult.error;
        }

        const { requestedId, rawMigratedDoc, esRequestIndex } = expectedResult.value;
        const response = bulkResponse.items[esRequestIndex];
        const {
          error,
          _id: responseId,
          _seq_no: seqNo,
          _primary_term: primaryTerm,
        } = Object.values(response)[0] as any;

        const {
          _source: { type, [type]: attributes, references = [], namespaces },
        } = rawMigratedDoc;

        const id = requestedId || responseId;
        if (error) {
          return {
            id,
            type,
            error: getBulkOperationError(error, type, id),
          };
        }
        return {
          id,
          type,
          ...(namespaces && { namespaces }),
          updated_at: time,
          version: encodeVersion(seqNo, primaryTerm),
          attributes,
          references,
        };
      }),
    };
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
      throw SavedObjectsErrorHelpers.createGenericNotFoundError();
    }

    const { namespace, refresh = DEFAULT_REFRESH_SETTING } = options;

    // Instead of the get, we could always do a _delete_by_query
    const getResponse = await this._callCluster('get', {
      id: this._serializer.generateRawId(namespace, type, id),
      index: this.getIndexForType(type),
      ignore: [404],
    });

    const getDocNotFound = getResponse.found === false;
    const getIndexNotFound = getResponse.status === 404;
    if (
      getDocNotFound ||
      getIndexNotFound ||
      !this._rawInNamespaces(getResponse, options.namespace)
    ) {
      throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
    }

    const deleteResponse = await this._writeToCluster('delete', {
      id: this._serializer.generateRawId(namespace, type, id),
      index: this.getIndexForType(type),
      refresh,
      ignore: [404],
    });

    const deleted = deleteResponse.result === 'deleted';
    if (deleted) {
      return {};
    }

    const deleteDocNotFound = deleteResponse.result === 'not_found';
    const deleteIndexNotFound =
      deleteResponse.error && deleteResponse.error.type === 'index_not_found_exception';
    if (deleteDocNotFound || deleteIndexNotFound) {
      // see "404s from missing index" above
      throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
    }

    throw new Error(
      `Unexpected Elasticsearch DELETE response: ${JSON.stringify({
        type,
        id,
        response: deleteResponse,
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

    const { refresh = DEFAULT_REFRESH_SETTING } = options;

    const allTypes = Object.keys(getRootPropertiesObjects(this._mappings));

    const typesToDelete = allTypes.filter(type => this._schema.isNamespace(type));

    const esOptions = {
      index: this.getIndicesForTypes(typesToDelete),
      ignore: [404],
      refresh,
      body: {
        conflicts: 'proceed',
        ...getSearchDsl(this._mappings, this._schema, {
          namespace,
          type: typesToDelete,
        }),
      },
    };

    return await this._writeToCluster('deleteByQuery', esOptions);
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
   * @returns {promise} - { saved_objects: [{ id, type, version, attributes }], total, per_page, page }
   */
  async find<T extends SavedObjectAttributes = any>({
    search,
    defaultSearchOperator = 'OR',
    searchFields,
    hasReference,
    page = 1,
    perPage = 20,
    sortField,
    sortOrder,
    fields,
    namespace,
    type,
    filter,
  }: SavedObjectsFindOptions): Promise<SavedObjectsFindResponse<T>> {
    if (!type) {
      throw SavedObjectsErrorHelpers.createBadRequestError(
        'options.type must be a string or an array of strings'
      );
    }

    const types = Array.isArray(type) ? type : [type];
    const allowedTypes = types.filter(t => this._allowedTypes.includes(t));
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
      ignore: [404],
      rest_total_hits_as_int: true,
      body: {
        seq_no_primary_term: true,
        ...getSearchDsl(this._mappings, this._schema, {
          search,
          defaultSearchOperator,
          searchFields,
          type: allowedTypes,
          sortField,
          sortOrder,
          namespace,
          hasReference,
          kueryNode,
        }),
      },
    };

    const response = await this._callCluster('search', esOptions);

    if (response.status === 404) {
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
      total: response.hits.total,
      saved_objects: response.hits.hits.map((hit: RawDoc) => this._rawToSavedObject(hit)),
    };
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
  async bulkGet<T extends SavedObjectAttributes = any>(
    objects: SavedObjectsBulkGetObject[] = [],
    options: SavedObjectsBaseOptions = {}
  ): Promise<SavedObjectsBulkResponse<T>> {
    const { namespace } = options;

    if (objects.length === 0) {
      return { saved_objects: [] };
    }

    const unsupportedTypeObjects = objects
      .filter(o => !this._allowedTypes.includes(o.type))
      .map(({ type, id }) => {
        return ({
          id,
          type,
          error: SavedObjectsErrorHelpers.createUnsupportedTypeError(type).output.payload,
        } as any) as SavedObject<T>;
      });

    const supportedTypeObjects = objects.filter(o => this._allowedTypes.includes(o.type));

    const response = await this._callCluster('mget', {
      body: {
        docs: supportedTypeObjects.map(({ type, id, fields }) => {
          return {
            _id: this._serializer.generateRawId(namespace, type, id),
            _index: this.getIndexForType(type),
            _source: includedFields(type, fields),
          };
        }),
      },
    });

    return {
      saved_objects: (response.docs as any[])
        .map((doc, i) => {
          const { id, type } = supportedTypeObjects[i];

          if (!doc.found || !this._rawInNamespaces(doc, namespace)) {
            return ({
              id,
              type,
              error: { statusCode: 404, message: 'Not found' },
            } as any) as SavedObject<T>;
          }

          const time = doc._source.updated_at;
          return {
            id,
            type,
            ...(doc._source.namespaces && { namespaces: doc._source.namespaces }),
            ...(time && { updated_at: time }),
            version: encodeHitVersion(doc),
            attributes: doc._source[type],
            references: doc._source.references || [],
            migrationVersion: doc._source.migrationVersion,
          };
        })
        .concat(unsupportedTypeObjects),
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
  async get<T extends SavedObjectAttributes = any>(
    type: string,
    id: string,
    options: SavedObjectsBaseOptions = {}
  ): Promise<SavedObject<T>> {
    if (!this._allowedTypes.includes(type)) {
      throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
    }

    const { namespace } = options;

    const response = await this._callCluster('get', {
      id: this._serializer.generateRawId(namespace, type, id),
      index: this.getIndexForType(type),
      ignore: [404],
    });

    const docNotFound = response.found === false;
    const indexNotFound = response.status === 404;
    if (docNotFound || indexNotFound || !this._rawInNamespaces(response, namespace)) {
      // see "404s from missing index" above
      throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
    }

    const { updated_at: updatedAt } = response._source;

    return {
      id,
      type,
      ...(response._source.namespaces && { namespaces: response._source.namespaces }),
      ...(updatedAt && { updated_at: updatedAt }),
      version: encodeHitVersion(response),
      attributes: response._source[type],
      references: response._source.references || [],
      migrationVersion: response._source.migrationVersion,
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
  async update<T extends SavedObjectAttributes = any>(
    type: string,
    id: string,
    attributes: Partial<T>,
    options: SavedObjectsUpdateOptions = {}
  ): Promise<SavedObjectsUpdateResponse<T>> {
    if (!this._allowedTypes.includes(type)) {
      throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
    }

    const { version, namespace, references, refresh = DEFAULT_REFRESH_SETTING } = options;

    // Instead of the get, we could always do an _update_by_query
    const getResponse = await this._callCluster('get', {
      id: this._serializer.generateRawId(namespace, type, id),
      index: this.getIndexForType(type),
      ignore: [404],
    });

    const getDocNotFound = getResponse.found === false;
    const getIndexNotFound = getResponse.status === 404;
    if (
      getDocNotFound ||
      getIndexNotFound ||
      !this._rawInNamespaces(getResponse, options.namespace)
    ) {
      throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
    }

    const time = this._getCurrentTime();

    const doc = {
      [type]: attributes,
      updated_at: time,
      references,
    };
    if (!Array.isArray(doc.references)) {
      delete doc.references;
    }

    const updateResponse = await this._writeToCluster('update', {
      id: this._serializer.generateRawId(namespace, type, id),
      index: this.getIndexForType(type),
      ...(version && decodeRequestVersion(version)),
      refresh,
      ignore: [404],
      body: {
        doc,
      },
      ...(this._schema.isNamespaces(type) && { _sourceIncludes: ['namespaces'] }),
    });

    if (updateResponse.status === 404) {
      // see "404s from missing index" above
      throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
    }

    return {
      id,
      type,
      updated_at: time,
      version: encodeHitVersion(updateResponse),
      ...(this._schema.isNamespaces(type) && { namespaces: updateResponse.get._source.namespaces }),
      references,
      attributes,
    };
  }

  async updateNamespaces(
    type: string,
    id: string,
    namespaces: string[],
    options: SavedObjectsUpdateNamespacesOptions = {}
  ): Promise<void> {
    if (!this._allowedTypes.includes(type)) {
      throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
    }

    if (!this._schema.isNamespaces(type)) {
      throw SavedObjectsErrorHelpers.createBadRequestError(`${type} doesn't support namespaces`);
    }

    const { version, refresh = DEFAULT_REFRESH_SETTING } = options;

    const time = this._getCurrentTime();

    const doc = {
      updated_at: time,
      namespaces,
    };

    const updateResponse = await this._writeToCluster('update', {
      id: this._serializer.generateRawId(undefined, type, id),
      index: this.getIndexForType(type),
      ...(version && decodeRequestVersion(version)),
      refresh,
      ignore: [404],
      body: {
        doc,
      },
    });

    if (updateResponse.status === 404) {
      // see "404s from missing index" above
      throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
    }

    return;
  }

  /**
   * Updates multiple objects in bulk
   *
   * @param {array} objects - [{ type, id, attributes, options: { version, namespace } references }]
   * @property {string} options.version - ensures version matches that of persisted object
   * @property {string} [options.namespace]
   * @returns {promise} -  {saved_objects: [[{ id, type, version, references, attributes, error: { message } }]}
   */
  async bulkUpdate<T extends SavedObjectAttributes = any>(
    objects: Array<SavedObjectsBulkUpdateObject<T>>,
    options: SavedObjectsBulkUpdateOptions = {}
  ): Promise<SavedObjectsBulkUpdateResponse<T>> {
    const time = this._getCurrentTime();
    const { namespace } = options;

    let bulkGetRequestIndexCounter = 0;
    const bulkGetDocs: object[] = [];
    const expectedBulkGetResults: Array<Either<any, any>> = objects.map(object => {
      const { type, id } = object;

      if (!this._allowedTypes.includes(type)) {
        return {
          tag: 'Left' as 'Left',
          error: {
            id,
            type,
            error: SavedObjectsErrorHelpers.createGenericNotFoundError(type, id).output.payload,
          },
        };
      }

      const { attributes, references, version } = object;

      const documentToSave = {
        [type]: attributes,
        updated_at: time,
        references,
      };

      if (!Array.isArray(documentToSave.references)) {
        delete documentToSave.references;
      }

      if (!this._schema.isNamespaces) {
        return {
          tag: 'Right' as 'Right',
          value: {
            type,
            id,
            version,
            documentToSave,
          },
        };
      }

      bulkGetDocs.push({
        _id: this._serializer.generateRawId(namespace, type, id),
        _index: this.getIndexForType(type),
        _source: ['type', 'namespaces'],
      });

      return {
        tag: 'Right' as 'Right',
        value: {
          type,
          id,
          version,
          esRequestIndex: bulkGetRequestIndexCounter++,
          documentToSave,
        },
      };
    });

    const bulkGetResponse = bulkGetDocs.length
      ? await this._callCluster('mget', {
          body: {
            docs: bulkGetDocs,
          },
          ignore: [404],
        })
      : undefined;

    let bulkUpdateRequestIndexCounter = 0;
    const bulkUpdateParams: object[] = [];
    const expectedBulkUpdateResults: Array<Either<any, any>> = expectedBulkGetResults.map(
      expectedBulkGetResult => {
        if (isLeft(expectedBulkGetResult)) {
          return expectedBulkGetResult;
        }

        const { esRequestIndex, id, type, version, documentToSave } = expectedBulkGetResult.value;
        let namespaces;
        if (esRequestIndex !== undefined) {
          const indexFound = bulkGetResponse.status !== 404;
          const actualResult = indexFound ? bulkGetResponse.docs[esRequestIndex] : undefined;
          const docFound = indexFound && actualResult.found === true;
          if (!indexFound || !docFound || !this._rawInNamespaces(actualResult, namespace)) {
            return {
              tag: 'Left' as 'Left',
              error: {
                id,
                type,
                error: SavedObjectsErrorHelpers.createGenericNotFoundError(type, id).output.payload,
              },
            };
          }
          namespaces = actualResult._source.namespaces;
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
              ...(version && decodeRequestVersion(version)),
            },
          },
          { doc: documentToSave }
        );

        return { tag: 'Right' as 'Right', value: expectedResult };
      }
    );

    const { refresh = DEFAULT_REFRESH_SETTING } = options;
    const bulkUpdateResponse = bulkUpdateParams.length
      ? await this._writeToCluster('bulk', {
          refresh,
          body: bulkUpdateParams,
        })
      : {};

    return {
      saved_objects: expectedBulkUpdateResults.map(expectedResult => {
        if (isLeft(expectedResult)) {
          return expectedResult.error;
        }

        const { type, id, namespaces, documentToSave, esRequestIndex } = expectedResult.value;
        const response = bulkUpdateResponse.items[esRequestIndex];
        const { error, _seq_no: seqNo, _primary_term: primaryTerm } = Object.values(
          response
        )[0] as any;

        const { [type]: attributes, references, updated_at } = documentToSave;
        if (error) {
          return {
            id,
            type,
            error: getBulkOperationError(error, type, id),
          };
        }
        return {
          id,
          type,
          ...(namespaces && { namespaces }),
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
  ) {
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

    const migrated = this._migrator.migrateDocument({
      id,
      type,
      attributes: { [counterFieldName]: 1 },
      migrationVersion,
      updated_at: time,
    });

    const raw = this._serializer.savedObjectToRaw(migrated as SanitizedSavedObjectDoc);

    const response = await this._writeToCluster('update', {
      id: this._serializer.generateRawId(namespace, type, id),
      index: this.getIndexForType(type),
      refresh,
      _source: true,
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
        ...getSearchDsl(this._mappings, this._schema, {
          type,
          namespace,
        }),
      },
    });

    return {
      id,
      type,
      updated_at: time,
      references: response.get._source.references,
      version: encodeHitVersion(response),
      attributes: response.get._source[type],
    };
  }

  private async _writeToCluster(...args: Parameters<APICaller>) {
    try {
      return await this._callCluster(...args);
    } catch (err) {
      throw decorateEsError(err);
    }
  }

  private async _callCluster(...args: Parameters<APICaller>) {
    try {
      return await this._unwrappedCallCluster(...args);
    } catch (err) {
      throw decorateEsError(err);
    }
  }

  /**
   * Returns index specified by the given type or the default index
   *
   * @param type - the type
   */
  private getIndexForType(type: string) {
    return this._schema.getIndexForType(this._config, type) || this._index;
  }

  /**
   * Returns an array of indices as specified in `this._schema` for each of the
   * given `types`. If any of the types don't have an associated index, the
   * default index `this._index` will be included.
   *
   * @param types The types whose indices should be retrieved
   */
  private getIndicesForTypes(types: string[]) {
    const unique = (array: string[]) => [...new Set(array)];
    return unique(types.map(t => this._schema.getIndexForType(this._config, t) || this._index));
  }

  private _getCurrentTime() {
    return new Date().toISOString();
  }

  // The internal representation of the saved object that the serializer returns
  // includes the namespace, and we use this for migrating documents. However, we don't
  // want the namespace to be returned from the repository, as the repository scopes each
  // method transparently to the specified namespace.
  private _rawToSavedObject(raw: RawDoc): SavedObject {
    const savedObject = this._serializer.rawToSavedObject(raw);
    return omit(savedObject, 'namespace');
  }

  private _rawInNamespaces(raw: RawDoc, namespace?: string) {
    const rawDocType = raw._source.type as string;

    // if the type is namespace isolated, or namespace agnostic, we can continue to rely on the guarantees
    // of the document ID format and don't need to check this
    if (this._schema.isNamespace(rawDocType) || this._schema.isNamespaceAgnostic(rawDocType)) {
      return true;
    }

    const namespaces = raw._source.namespaces as Array<string | null>;
    return namespaces.includes(namespace === undefined ? 'default' : namespace);
  }
}

function getBulkOperationError(error: { type: string; reason?: string }, type: string, id: string) {
  switch (error.type) {
    case 'version_conflict_engine_exception':
      return { statusCode: 409, message: 'version conflict, document already exists' };
    case 'document_missing_exception':
      return SavedObjectsErrorHelpers.createGenericNotFoundError(type, id).output.payload;
    default:
      return {
        message: error.reason || JSON.stringify(error),
      };
  }
}
