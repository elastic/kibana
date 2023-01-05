/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { once } from 'lodash';
import { pipe } from 'lodash/fp';
import { Logger } from '@kbn/core/server';
import { toElasticsearchQuery } from '@kbn/es-query';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { MappingProperty, SearchTotalHits } from '@elastic/elasticsearch/lib/api/types';
import type { FilesMetrics, FileMetadata, Pagination } from '../../../../common';
import type { FindFileArgs } from '../../../file_service';
import type {
  DeleteArg,
  FileDescriptor,
  FileMetadataClient,
  GetArg,
  GetUsageMetricsArgs,
  UpdateArgs,
} from '../file_metadata_client';
import { filterArgsToKuery } from './query_filters';
import { fileObjectType } from '../../../saved_objects/file';

const filterArgsToESQuery = pipe(filterArgsToKuery, toElasticsearchQuery);

const fileMappings: MappingProperty = {
  dynamic: false,
  type: 'object',
  properties: {
    ...fileObjectType.mappings.properties,
  },
};

interface FileDocument<M = unknown> {
  file: FileMetadata<M>;
}

export class EsIndexFilesMetadataClient<M = unknown> implements FileMetadataClient {
  constructor(
    private readonly index: string,
    private readonly esClient: ElasticsearchClient,
    private readonly logger: Logger
  ) {}

  private createIfNotExists = once(async () => {
    try {
      if (await this.esClient.indices.exists({ index: this.index })) {
        return;
      }
      await this.esClient.indices.create({
        index: this.index,
        mappings: {
          dynamic: false,
          properties: {
            file: fileMappings,
          },
        },
      });
    } catch (e) {
      // best effort
    }
  });

  async create({ id, metadata }: FileDescriptor<M>): Promise<FileDescriptor<M>> {
    await this.createIfNotExists();
    const result = await this.esClient.index<FileDocument>({
      index: this.index,
      id,
      document: { file: metadata },
      refresh: true,
    });
    return {
      id: result._id,
      metadata,
    };
  }

  async get({ id }: GetArg): Promise<FileDescriptor<M>> {
    const { _source: doc } = await this.esClient.get<FileDocument<M>>({
      index: this.index,
      id,
    });

    if (!doc) {
      this.logger.error(`File with id "${id}" not found`);
      throw new Error('File not found');
    }

    return {
      id,
      metadata: doc.file,
    };
  }

  async delete({ id }: DeleteArg): Promise<void> {
    await this.esClient.delete({ index: this.index, id });
  }

  async update({ id, metadata }: UpdateArgs<M>): Promise<FileDescriptor<M>> {
    await this.esClient.update({ index: this.index, id, doc: { file: metadata }, refresh: true });
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
    const result = await this.esClient.search<FileDocument<M>>({
      track_total_hits: true,
      index: this.index,
      expand_wildcards: 'hidden',
      query: filterArgsToESQuery({ ...filterArgs, attrPrefix: this.attrPrefix }),
      ...this.paginationToES({ page, perPage }),
      sort: 'file.created',
    });

    return {
      total: (result.hits.total as SearchTotalHits).value,
      files: result.hits.hits.map((r) => ({ id: r._id, metadata: r._source?.file! })),
    };
  }

  async getUsageMetrics(arg: GetUsageMetricsArgs): Promise<FilesMetrics> {
    throw new Error('Not implemented');
  }
}
