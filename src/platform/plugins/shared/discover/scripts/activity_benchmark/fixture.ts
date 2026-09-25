/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { randomUUID } from 'node:crypto';
import seedrandom from 'seedrandom';

interface FixtureOptions {
  request: (
    path: string,
    method: 'GET' | 'POST' | 'PUT',
    body?: string,
    signal?: AbortSignal
  ) => Promise<string>;
  documents: number;
  fields: number;
  groups: number;
  seed: number;
  signal?: AbortSignal;
}

export interface CreatedFixture {
  indexName: string;
  scope: {
    query: string;
    indexPattern: string;
    timeFieldName: string;
    timeRange: { from: string; to: string };
  };
  meta: Omit<FixtureOptions, 'request' | 'signal'> & { intervalMs: number; description: string };
}

const START_TIME = Date.parse('2026-01-01T00:00:00Z');
const INTERVAL_MS = 3_600_000;
const BUCKETS = 48;
const BULK_SIZE = 1000;

/** Creates a dedicated benchmark index; failed or completed fixtures are never deleted automatically. */
export const createFixture = async ({
  request,
  documents,
  fields,
  groups,
  seed,
  signal,
}: FixtureOptions): Promise<CreatedFixture> => {
  if (
    ![100_000, 1_000_000, 10_000_000].includes(documents) ||
    !Number.isInteger(fields) ||
    fields < 1 ||
    fields > 10 ||
    !Number.isInteger(groups) ||
    groups < 10 ||
    groups > 1000 ||
    !Number.isSafeInteger(seed)
  ) {
    throw new RangeError(
      'Expected 100k/1m/10m documents, 1–10 fields, 10–1000 groups and an integer seed'
    );
  }
  const indexName = `discover-activity-bench-${randomUUID()}`;
  const randomByField = Array.from({ length: fields }, (_, field) =>
    seedrandom(`${seed}:${field}`)
  );
  const properties: Record<string, { type: 'date' | 'long' | 'keyword' }> = {
    '@timestamp': { type: 'date' },
    sequence: { type: 'long' },
  };
  for (let field = 0; field < fields; field++) {
    properties[`dimension_${field}`] = { type: 'keyword' };
  }

  try {
    signal?.throwIfAborted();
    await request(
      `/${indexName}`,
      'PUT',
      JSON.stringify({
        settings: { number_of_shards: 1, number_of_replicas: 0, refresh_interval: '-1' },
        mappings: { dynamic: 'strict', properties },
      }),
      signal
    );
    for (let offset = 0; offset < documents; offset += BULK_SIZE) {
      signal?.throwIfAborted();
      const batchSize = Math.min(BULK_SIZE, documents - offset);
      const lines: string[] = [];
      for (let sequence = offset; sequence < offset + batchSize; sequence++) {
        const bucket = Math.floor((sequence * BUCKETS) / documents);
        const bucketStart = Math.ceil((bucket * documents) / BUCKETS);
        const bucketSize = Math.ceil(((bucket + 1) * documents) / BUCKETS) - bucketStart;
        const position = (sequence - bucketStart + Math.abs(seed)) % bucketSize;
        // The target grows by 30%; rounding whole documents is the only approximation.
        // Evenly spaced target rows replace other groups, keeping each bucket's total unchanged.
        const targetCount = Math.floor((bucketSize * (bucket < 24 ? 10 : 13)) / (groups * 10));
        const targetsBefore = Math.floor((position * targetCount) / bucketSize);
        const isTarget = Math.floor(((position + 1) * targetCount) / bucketSize) > targetsBefore;
        const group = isTarget ? 0 : 1 + ((position - targetsBefore) % (groups - 1));
        const document: Record<string, string | number | string[]> = {
          '@timestamp': new Date(
            START_TIME +
              bucket * INTERVAL_MS +
              Math.floor(((sequence - bucketStart) * INTERVAL_MS) / bucketSize)
          ).toISOString(),
          sequence,
          dimension_0: `group-${group}`,
        };
        for (let field = 1; field < fields; field++) {
          if (field === fields - 1 && sequence % 17 === 0) {
            continue;
          }
          const value = Math.floor(randomByField[field]() * groups);
          document[`dimension_${field}`] =
            field === fields - 1 && sequence % 13 === 0
              ? [`group-${value}`, `group-${(value + 1) % groups}`]
              : `group-${value}`;
        }
        lines.push(JSON.stringify({ create: { _id: String(sequence) } }), JSON.stringify(document));
      }
      const bulk = JSON.parse(
        await request(`/${indexName}/_bulk`, 'POST', `${lines.join('\n')}\n`, signal)
      ) as {
        errors?: boolean;
        items?: Array<{ create?: { status: number; error?: { reason?: string } } }>;
      };
      const items = bulk.items ?? [];
      const failed = items.find((item) => item.create?.status !== 201);
      if (bulk.errors !== false || items.length !== batchSize || failed) {
        throw new Error(
          `Bulk create failed at offset ${offset}: ${
            failed?.create?.error?.reason ?? 'incomplete response'
          }`
        );
      }
    }
    const refreshed = JSON.parse(
      await request(`/${indexName}/_refresh`, 'POST', undefined, signal)
    ) as {
      _shards?: { failed: number };
    };
    if (refreshed._shards?.failed !== 0) {
      throw new Error('Fixture refresh failed');
    }
  } catch (cause) {
    throw new Error(`Fixture creation did not complete. Any index ${indexName} is left in place.`, {
      cause,
    });
  }

  return {
    indexName,
    scope: {
      query: `FROM ${indexName}`,
      indexPattern: indexName,
      timeFieldName: '@timestamp',
      timeRange: {
        from: new Date(START_TIME).toISOString(),
        to: new Date(START_TIME + BUCKETS * INTERVAL_MS).toISOString(),
      },
    },
    meta: {
      documents,
      fields,
      groups,
      seed,
      intervalMs: INTERVAL_MS,
      description:
        '48 complete hourly buckets. dimension_0 group-0 has a 30% increase target at hour 24, rounded to whole documents, while total volume stays constant. With multiple fields, the last dimension is missing every 17th row and multivalue every 13th row unless missing; its groups are not disjoint populations.',
    },
  };
};
