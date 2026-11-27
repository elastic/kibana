/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { IRouter } from '@kbn/core/server';
import { isNotFoundError } from '@kbn/es-errors';
import type {
  CatIndicesIndicesRecord,
  IndicesResolveIndexResponse,
} from '@elastic/elasticsearch/lib/api/types';
import type { IndexSummary, IndicesResponse } from '../../common';
import { INDICES_ROUTE, MAX_NAME_LENGTH } from '../../common';
import { toErrorResponse } from '../lib/error_response';
import { routeSecurity } from '../lib/route_config';

interface IndexStats {
  readonly docsCount: number;
  readonly storeSizeBytes: number;
  readonly health?: string;
}

export function registerIndicesRoute(router: IRouter) {
  router.get(
    {
      path: INDICES_ROUTE,
      security: routeSecurity,
      validate: {
        query: schema.object({
          pattern: schema.string({ defaultValue: '*', minLength: 1, maxLength: MAX_NAME_LENGTH }),
          includeHidden: schema.boolean({ defaultValue: false }),
        }),
      },
    },
    async (context, request, response) => {
      const { pattern, includeHidden } = request.query;
      const esClient = (await context.core).elasticsearch.client.asCurrentUser;
      const expandWildcards = includeHidden ? 'all' : 'open';

      try {
        const [resolved, catRecords] = await Promise.all([
          esClient.indices.resolveIndex({ name: pattern, expand_wildcards: expandWildcards }),
          esClient.cat.indices({
            index: pattern,
            expand_wildcards: 'all',
            format: 'json',
            bytes: 'b',
            h: ['index', 'health', 'docs.count', 'store.size'],
          }),
        ]);
        const body: IndicesResponse = { indices: summarize(resolved, toStatsMap(catRecords)) };
        return response.ok({ body });
      } catch (error) {
        if (isNotFoundError(error)) {
          const body: IndicesResponse = { indices: [] };
          return response.ok({ body });
        }
        return toErrorResponse(response, error);
      }
    }
  );
}

function toStatsMap(records: CatIndicesIndicesRecord[]): Map<string, IndexStats> {
  const stats = new Map<string, IndexStats>();
  for (const record of records) {
    if (!record.index) continue;
    stats.set(record.index, {
      docsCount: Number(record['docs.count'] ?? 0),
      storeSizeBytes: Number(record['store.size'] ?? 0),
      health: record.health,
    });
  }
  return stats;
}

function sumStats(names: readonly string[], stats: Map<string, IndexStats>) {
  let docsCount = 0;
  let storeSizeBytes = 0;
  for (const name of names) {
    const entry = stats.get(name);
    if (!entry) continue;
    docsCount += entry.docsCount;
    storeSizeBytes += entry.storeSizeBytes;
  }
  return { docsCount, storeSizeBytes };
}

function summarize(
  resolved: IndicesResolveIndexResponse,
  stats: Map<string, IndexStats>
): IndexSummary[] {
  const dataStreamBackingIndices = new Map<string, readonly string[]>();
  for (const dataStream of resolved.data_streams) {
    const backing = dataStream.backing_indices;
    dataStreamBackingIndices.set(dataStream.name, Array.isArray(backing) ? backing : [backing]);
  }

  const summaries: IndexSummary[] = [];

  for (const index of resolved.indices) {
    const entry = stats.get(index.name);
    summaries.push({ name: index.name, kind: 'index', ...entry });
  }

  for (const [name, backing] of dataStreamBackingIndices) {
    summaries.push({ name, kind: 'data_stream', targets: backing, ...sumStats(backing, stats) });
  }

  for (const alias of resolved.aliases) {
    const targets = Array.isArray(alias.indices) ? alias.indices : [alias.indices];
    const concrete = targets.flatMap((target) => dataStreamBackingIndices.get(target) ?? [target]);
    summaries.push({ name: alias.name, kind: 'alias', targets, ...sumStats(concrete, stats) });
  }

  return summaries.sort((a, b) => a.name.localeCompare(b.name));
}
