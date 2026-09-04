/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { DocumentVersionFields } from '../../types';

export interface DocumentVersionManagerDeps {
  esClient: ElasticsearchClient;
  dataStreamName: string;
  logger: Logger;
}

export class DocumentVersionManager {
  private readonly cache = new Map<string, Required<DocumentVersionFields>>();

  constructor(private readonly deps: DocumentVersionManagerDeps) {}

  setVersion(id: string, version: Required<DocumentVersionFields>): void {
    this.cache.set(id, version);
  }

  async bulkGetFreshVersions(
    ids: string[],
    writeIndex?: string
  ): Promise<Record<string, Required<DocumentVersionFields>>> {
    if (ids.length === 0) {
      return {};
    }

    const resolvedWriteIndex = writeIndex ?? (await this.getMeta()).backingIndexes.at(-1);
    const result: Record<string, Required<DocumentVersionFields>> = {};

    const mgetResponse = await this.deps.esClient.mget({
      docs: ids.map((id) => ({ _index: resolvedWriteIndex, _id: id, _source: false })),
    });

    const missing: string[] = [];
    for (const doc of mgetResponse.docs) {
      if (
        'found' in doc &&
        doc.found &&
        doc._seq_no !== undefined &&
        doc._primary_term !== undefined
      ) {
        const version: Required<DocumentVersionFields> = {
          index: doc._index,
          seqNo: doc._seq_no,
          primaryTerm: doc._primary_term,
        };
        this.cache.set(doc._id, version);
        result[doc._id] = version;
      } else {
        missing.push(doc._id);
      }
    }

    if (missing.length > 0) {
      const searchResponse = await this.deps.esClient.search({
        index: this.deps.dataStreamName,
        query: { ids: { values: missing } },
        size: missing.length,
        _source: false,
        ignore_unavailable: true,
      });

      for (const hit of searchResponse.hits.hits) {
        if (hit._id && hit._seq_no !== undefined && hit._primary_term !== undefined) {
          const version: Required<DocumentVersionFields> = {
            index: hit._index,
            seqNo: hit._seq_no,
            primaryTerm: hit._primary_term,
          };
          this.cache.set(hit._id, version);
          result[hit._id] = version;
        }
      }
    }

    return result;
  }

  bulkGetCachedVersions(ids: string[]): Record<string, Required<DocumentVersionFields>> {
    const result: Record<string, Required<DocumentVersionFields>> = {};
    for (const id of ids) {
      const cached = this.cache.get(id);
      if (cached) {
        result[id] = cached;
      }
    }
    return result;
  }

  async bulkGetVersions(ids: string[]): Promise<Record<string, Required<DocumentVersionFields>>> {
    if (ids.length === 0) {
      return {};
    }

    const result: Record<string, Required<DocumentVersionFields>> = {};
    const uncached: string[] = [];

    for (const id of ids) {
      const cached = this.cache.get(id);
      if (cached) {
        result[id] = cached;
      } else {
        uncached.push(id);
      }
    }

    if (uncached.length > 0) {
      const fresh = await this.bulkGetFreshVersions(uncached);
      Object.assign(result, fresh);
    }

    return result;
  }

  async getMeta(): Promise<{ retentionTime: string | undefined; backingIndexes: string[] }> {
    const { data_streams: dataStreams } = await this.deps.esClient.indices.getDataStream({
      name: this.deps.dataStreamName,
    });

    const dataStream = dataStreams[0];
    const retentionTime = dataStream?.lifecycle?.data_retention as string | undefined;
    const backingIndexes = (dataStream?.indices ?? []).map((idx) => idx.index_name);
    return { retentionTime, backingIndexes };
  }
}
