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

import _ from 'lodash';
import { BatchIndexReader } from './batch_index_reader';
import { savedObjectToRaw } from './saved_object';
import {
  AliasAction,
  CallCluster,
  IndexMapping,
  MigrationVersion,
  NotFound,
  SavedObjectDoc,
} from './types';

/*
 * This module contains various functions for querying and manipulating
 * elasticsearch indices.
 */

// Require rather than import gets us around the lack of TypeScript definitions
// for "getTypes"
// tslint:disable-next-line:no-var-requires
const { getTypes } = require('../../../mappings');

interface Opts {
  callCluster: CallCluster;
  index: string;
}

export interface FullIndexInfo {
  aliases: { [name: string]: object };
  exists: boolean;
  indexName: string;
  mappings: IndexMapping;
}

/**
 * Helper methods for querying / manipulating indices.
 */
export class ElasticIndex {
  private callCluster: CallCluster;
  private index: string;

  /**
   * Creates an instance of ElasticIndex.
   *
   * @param {Opts} opts
   * @prop {CallCluster} callCluster - The elastic search connection
   * @prop {string} index - The name of the index or alias
   * @memberof ElasticIndex
   */
  constructor(opts: Opts) {
    this.callCluster = opts.callCluster;
    this.index = opts.index;
  }

  /**
   * Gets the index name.
   */
  public get name() {
    return this.index;
  }

  /**
   * Gets the index name.
   */
  public toString() {
    return this.index;
  }

  /**
   * Fetches information about the index.
   */
  public async fetchInfo(): Promise<FullIndexInfo> {
    const { callCluster, index } = this;
    const result = await callCluster('indices.get', {
      ignore: [404],
      index,
    });

    if ((result as NotFound).status === 404) {
      return {
        aliases: {},
        exists: false,
        indexName: index,
        mappings: { doc: { dynamic: 'strict', properties: {} } },
      };
    }

    const [indexName, indexInfo] = Object.entries(result)[0];

    return assertIsSupportedIndex({
      ...indexInfo,
      exists: true,
      indexName,
    });
  }

  /**
   * Creates a reader for the documents in the index.
   *
   * @param Opts
   * @prop {number} batchSize - The number of documents to read at a time
   * @prop {string} scrollDuration - The scroll duration used for scrolling through the index
   * @memberof BatchIndexWriter
   */
  public reader({
    batchSize,
    scrollDuration,
  }: {
    batchSize: number;
    scrollDuration: string;
  }) {
    return new BatchIndexReader({
      batchSize,
      callCluster: this.callCluster,
      index: this.index,
      scrollDuration,
    });
  }

  /**
   * Writes the specified documents to the index, throws an exception
   * if any of the documents fail to save.
   *
   * @param {SavedObjectDoc[]} docs - The saved object docs being written.
   * @memberof BatchIndexWriter
   */
  public async write(docs: SavedObjectDoc[]) {
    const { callCluster, index } = this;
    const result = await callCluster('bulk', {
      body: docs.reduce((acc: object[], doc: SavedObjectDoc) => {
        const raw = savedObjectToRaw(doc);

        acc.push({
          index: {
            _id: raw._id,
            _index: index,
            _type: 'doc',
          },
        });

        acc.push(raw._source);

        return acc;
      }, []),
    });

    const err = _.find(result.items, 'index.error.reason');

    if (!err) {
      return;
    }

    const exception: any = new Error(err.index.error!.reason);
    exception.detail = err;
    throw exception;
  }

  /**
   * Checks to see if the specified index is up to date. It does this by checking
   * that the index has the expected mappings and by counting
   * the number of documents that have a property which has migrations defined for it,
   * but which has not had those migrations applied. We don't want to cache the
   * results of this function (e.g. in context or somewhere), as it is important that
   * it performs the check *each* time it is called.
   *
   * @param {MigrationVersion} migrationVersion - The latest versions of the migrations
   */
  public async hasMigrations(
    migrationVersion: MigrationVersion
  ): Promise<boolean> {
    const { callCluster, index } = this;
    const indexInfo = await this.fetchInfo();

    if (!_.get(indexInfo, 'mappings.doc.properties.migrationVersion')) {
      return false;
    }

    const { count } = await callCluster('count', {
      body: {
        query: {
          bool: {
            should: Object.entries(migrationVersion).map(
              ([type, latestVersion]) => ({
                bool: {
                  must: [
                    {
                      exists: {
                        field: type,
                      },
                    },
                    {
                      bool: {
                        must_not: {
                          term: {
                            [`migrationVersion.${type}`]: latestVersion,
                          },
                        },
                      },
                    },
                  ],
                },
              })
            ),
          },
        },
      },
      index,
      type: 'doc',
    });

    return count === 0;
  }

  /**
   * Applies the specified mappings to the index.
   *
   * @param {IndexMapping} mappings
   */
  public putMappings(mappings: IndexMapping) {
    const { callCluster, index } = this;
    return callCluster('indices.putMapping', {
      body: mappings.doc,
      index,
      type: 'doc',
    });
  }

  /**
   * Creates the index. Returns true if the index was created, false if it already existed.
   *
   * @param {IndexMapping} mappings
   */
  public async create(mappings?: IndexMapping) {
    const { callCluster, index } = this;

    try {
      await callCluster('indices.create', {
        body: { mappings },
        index,
      });

      return true;
    } catch (error) {
      const isIndexExistsError =
        _.get(error, 'body.error.type') === 'resource_already_exists_exception';

      if (isIndexExistsError) {
        return false;
      }

      throw error;
    }
  }

  /**
   * Deletes the index.
   */
  public async deleteIndex() {
    const { callCluster, index } = this;
    await callCluster('indices.delete', { index });
  }

  /**
   * Ensures that the index is an alias. If it is not, it will be reindexed, and
   * converted into an alias that points to the new index.
   */
  public async convertToAlias() {
    const { callCluster, index } = this;

    if (await callCluster('indices.existsAlias', { name: index })) {
      return;
    }

    const originalIndex = `${index}_original`;

    await callCluster('reindex', {
      body: {
        dest: { index: originalIndex },
        source: { index },
      },
      refresh: true,
      waitForCompletion: true,
    });

    await this.claimAlias(index, [{ remove_index: { index } }]);
  }

  /**
   * Points the specified alias to the specified index. This is an exclusive
   * alias, meaning that it will only point to one index at a time, so we
   * remove any other indices from the alias.
   */
  public async claimAlias(alias: string, aliasActions: AliasAction[] = []) {
    const { callCluster, index } = this;
    const result = await callCluster('indices.getAlias', {
      ignore: [404],
      name: alias,
    });

    const aliasInfo = (result as NotFound).status === 404 ? {} : result;

    const removeActions = Object.keys(aliasInfo).map(key => ({
      remove: { index: key, alias },
    }));

    await callCluster('indices.updateAliases', {
      body: {
        actions: aliasActions
          .concat(removeActions)
          .concat({ add: { index, alias } }),
      },
    });

    await callCluster('indices.refresh', { index });
  }
}

/**
 * This is a rough check to ensure that the index being migrated satisfies at least
 * some rudimentary expectations. Past Kibana indices had multiple root documents, etc
 * and the migration system does not (yet?) handle those indices. They need to be upgraded
 * via v5 -> v6 upgrade tools first. This file contains index-agnostic logic, and this
 * check is itself index-agnostic, though the error hint is a bit Kibana specific.
 */
export async function assertIsSupportedIndex(indexInfo: FullIndexInfo) {
  const currentTypes = getTypes(indexInfo.mappings);
  const isV5Index = currentTypes.length > 1 || currentTypes[0] !== 'doc';
  if (isV5Index) {
    throw new Error(
      `Index ${indexInfo.indexName} belongs to a version of Kibana ` +
        `that cannot be automatically migrated. Reset it or use the X-Pack upgrade assistant.`
    );
  }
  return indexInfo;
}
