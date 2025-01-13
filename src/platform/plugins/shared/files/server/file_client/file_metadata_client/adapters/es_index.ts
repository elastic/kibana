/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { once } from 'lodash';
import { pipe } from 'lodash/fp';
import { Logger } from '@kbn/core/server';
import { toElasticsearchQuery } from '@kbn/es-query';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { MappingProperty, SearchTotalHits } from '@elastic/elasticsearch/lib/api/types';
import pLimit from 'p-limit';

import { wrapErrorAndReThrow } from '../../utils';
import type { FilesMetrics, FileMetadata, Pagination } from '../../../../common';
import type { FindFileArgs } from '../../../file_service';
import type {
  DeleteArg,
  FileDescriptor,
  FileMetadataClient,
  GetArg,
  BulkGetArg,
  GetUsageMetricsArgs,
  UpdateArgs,
} from '../file_metadata_client';
import { filterArgsToKuery } from './query_filters';
import { fileObjectType } from '../../../saved_objects/file';

const filterArgsToESQuery = pipe(filterArgsToKuery, toElasticsearchQuery);
const bulkGetConcurrency = pLimit(10);

const fileMappings: MappingProperty = {
  dynamic: false,
  type: 'object',
  properties: {
    ...fileObjectType.mappings.properties,
  },
};

export interface FileDocument<M = unknown> {
  file: FileMetadata<M>;
  /** Written only when `indexIsAlias` is `true` */
  '@timestamp'?: string;
}

export class EsIndexFilesMetadataClient<M = unknown> implements FileMetadataClient {
  constructor(
    private readonly index: string,
    private readonly esClient: ElasticsearchClient,
    private readonly logger: Logger,
    private readonly indexIsAlias: boolean = false
  ) {}

  private createIfNotExists = once(async () => {
    // We don't attempt to create the index if it is an Alias/DS
    if (this.indexIsAlias) {
      this.logger.debug(`No need to create index [${this.index}] as it is an Alias or DS.`);
      return;
    }

    try {
      if (await this.esClient.indices.exists({ index: this.index })) {
        return;
      }

      await this.esClient.indices
        .create({
          index: this.index,
          mappings: {
            dynamic: false,
            properties: {
              file: fileMappings,
            },
          },
        })
        .catch(
          wrapErrorAndReThrow.withMessagePrefix('EsIndexFilesMetadataClient.createIfNotExists(): ')
        );

      this.logger.info(`index [${this.index}] created with default mappings.`);
    } catch (e) {
      this.logger.error(`Failed to create index [${this.index}]: ${e.message}`);
      this.logger.debug(e);
      // best effort
    }
  });

  private async getBackingIndex(id: string): Promise<string> {
    if (!this.indexIsAlias) {
      return this.index;
    }

    const doc = await this.esClient
      .search({
        index: this.index,
        body: {
          size: 1,
          query: {
            term: {
              _id: id,
            },
          },
          _source: false, // suppress the document content
        },
      })
      .catch(
        wrapErrorAndReThrow.withMessagePrefix('EsIndexFilesMetadataClient.getBackingIndex(): ')
      );

    const docIndex = doc.hits.hits?.[0]?._index;

    if (!docIndex) {
      const err = new Error(
        `Unable to determine backing index for file id [${id}] in index (alias) [${this.index}]`
      );

      this.logger.error(err);
      throw err;
    }

    return docIndex;
  }

  async create({ id, metadata }: FileDescriptor<M>): Promise<FileDescriptor<M>> {
    await this.createIfNotExists();
    const result = await this.esClient
      .index<FileDocument>({
        index: this.index,
        id,
        document: {
          file: metadata,
          // Add `@timestamp` if index is an Alias/DS
          ...(this.indexIsAlias ? { '@timestamp': new Date().toISOString() } : {}),
        },
        op_type: 'create',
        refresh: 'wait_for',
      })
      .catch(wrapErrorAndReThrow.withMessagePrefix('EsIndexFilesMetadataClient.create(): '));

    return {
      id: result._id,
      metadata,
    };
  }

  async get({ id }: GetArg): Promise<FileDescriptor<M>> {
    const { esClient, index, indexIsAlias } = this;
    let doc: FileDocument<M> | undefined;

    if (indexIsAlias) {
      doc = (
        await esClient
          .search<FileDocument<M>>({
            index,
            body: {
              size: 1,
              query: {
                term: {
                  _id: id,
                },
              },
            },
          })
          .catch(wrapErrorAndReThrow.withMessagePrefix('EsIndexFilesMetadataClient.get(): '))
      ).hits.hits?.[0]?._source;
    } else {
      doc = (
        await esClient
          .get<FileDocument<M>>({
            index,
            id,
          })
          .catch(wrapErrorAndReThrow.withMessagePrefix('EsIndexFilesMetadataClient.get(): '))
      )._source;
    }

    if (!doc) {
      this.logger.error(
        `File with id "${id}" not found in index ${indexIsAlias ? 'alias ' : ''}"${index}"`
      );
      throw new Error('File not found');
    }

    return {
      id,
      metadata: doc.file,
    };
  }

  async bulkGet(arg: { ids: string[]; throwIfNotFound?: true }): Promise<FileDescriptor[]>;
  async bulkGet({ ids, throwIfNotFound }: BulkGetArg): Promise<Array<FileDescriptor | null>> {
    const promises = ids.map((id) =>
      bulkGetConcurrency(() =>
        this.get({ id }).catch((e) => {
          if (throwIfNotFound) {
            throw e;
          }
          return null;
        })
      )
    );
    const result = await Promise.all(promises);
    return result;
  }

  async delete({ id }: DeleteArg): Promise<void> {
    await this.esClient
      .delete({ index: this.index, id })
      .catch(wrapErrorAndReThrow.withMessagePrefix('EsIndexFilesMetadataClient.delete(): '));
  }

  async update({ id, metadata }: UpdateArgs<M>): Promise<FileDescriptor<M>> {
    const index = await this.getBackingIndex(id);

    await this.esClient
      .update({
        index,
        id,
        doc: { file: metadata },
        refresh: 'wait_for',
      })
      .catch(wrapErrorAndReThrow.withMessagePrefix('EsIndexFilesMetadataClient.update(): '));

    return this.get({ id });
  }

  private paginationToES({ page = 1, perPage = 50 }: Pagination) {
    return {
      size: perPage,
      from: (page - 1) * perPage,
    };
  }

  private attrPrefix: keyof FileDocument = 'file';

  async find({ page, perPage, ...filterArgs }: FindFileArgs = {}): Promise<{
    total: number;
    files: Array<FileDescriptor<unknown>>;
  }> {
    const result = await this.esClient
      .search<FileDocument<M>>({
        track_total_hits: true,
        index: this.index,
        expand_wildcards: 'hidden',
        query: filterArgsToESQuery({ ...filterArgs, attrPrefix: this.attrPrefix }),
        ...this.paginationToES({ page, perPage }),
        sort: 'file.created',
      })
      .catch(wrapErrorAndReThrow.withMessagePrefix('EsIndexFilesMetadataClient.find(): '));

    return {
      total: (result.hits.total as SearchTotalHits).value,
      files: result.hits.hits.map((r) => ({ id: r._id!, metadata: r._source?.file! })),
    };
  }

  async getUsageMetrics(arg: GetUsageMetricsArgs): Promise<FilesMetrics> {
    throw new Error('Not implemented');
  }
}
