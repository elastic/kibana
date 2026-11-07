/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * @jest-environment node
 */

import { Blob } from 'node:buffer';
import { CompressionStream, DecompressionStream } from 'node:stream/web';
import type { Request } from '../../common';
import { RequestAdapter, RequestStatus } from '../../common';
import {
  createRequestAdapters,
  decodeSnapshot,
  deserializeSnapshot,
  encodeSnapshot,
  MAX_SNAPSHOT_SIZE,
  serializeAdapters,
} from './snapshot';

// The browser globals are not exposed by the jest node environment
Object.assign(globalThis, { Blob, CompressionStream, DecompressionStream });

const meta = { kibanaVersion: '9.4.0', createdAt: '2026-11-02T10:00:00.000Z', timezone: 'UTC' };

const createAdapters = () => {
  const requests = new RequestAdapter();
  requests
    .start('Data', { id: 'docs', replayKey: 'key-docs' }, 1000)
    .json({ query: { match_all: {} } })
    .stats({ hits: { label: 'Hits', value: 10 } })
    .ok({ json: { rawResponse: { hits: { total: 10 } } } });
  requests.start('Failed', { id: 'failed' }, 1100).error({ json: { message: 'boom' } });

  const lensRequests = new RequestAdapter();
  lensRequests
    .start('Histogram', { id: 'histo', replayKey: 'key-histo' }, 1050)
    .json({ aggs: { histo: { date_histogram: {} } } })
    .ok({ json: { rawResponse: { aggregations: { histo: { buckets: [] } } } } });

  return { requests, lensRequests };
};

const summarize = (requests: Request[]) =>
  requests.map(({ id, name, status, json, replayKey, startTime, response }) => ({
    id,
    name,
    status,
    json,
    replayKey,
    startTime,
    responseJson: response?.json,
  }));

describe('inspector snapshot', () => {
  it('round trips requests, lensRequests and app state', () => {
    const adapters = createAdapters();
    const app = { id: 'discover', state: { appState: { columns: ['message'] } } };
    const snapshot = serializeAdapters({ ...adapters, other: { notAnAdapter: true } }, meta, app);

    expect(Object.keys(snapshot.requests)).toEqual(['requests', 'lensRequests']);

    const restored = deserializeSnapshot(JSON.stringify(snapshot));
    expect(restored.meta).toEqual(meta);
    expect(restored.app).toEqual(app);

    const rebuilt = createRequestAdapters(restored);
    expect(summarize(rebuilt.requests.getRequests())).toEqual(
      summarize(adapters.requests.getRequests())
    );
    expect(summarize(rebuilt.lensRequests.getRequests())).toEqual(
      summarize(adapters.lensRequests.getRequests())
    );
    expect(rebuilt.requests.getRequests()[1].status).toBe(RequestStatus.ERROR);
  });

  it('uses getRequestsBySource of aggregate adapters', () => {
    const { requests, lensRequests } = createAdapters();
    const aggregate = Object.assign(new RequestAdapter(), {
      getRequestsBySource: () => ({
        requests: requests.getRequests(),
        lensRequests: lensRequests.getRequests(),
      }),
    });

    const snapshot = serializeAdapters({ requests: aggregate }, meta);
    expect(snapshot.requests.lensRequests).toHaveLength(1);
    expect(snapshot.requests.requests).toHaveLength(2);
  });

  it('rejects unknown versions, invalid shapes and oversized input', () => {
    expect(() => deserializeSnapshot(JSON.stringify({ version: 2 }))).toThrow(
      'Unsupported snapshot version: 2'
    );
    expect(() =>
      deserializeSnapshot(JSON.stringify({ version: 1, meta, requests: { requests: [{}] } }))
    ).toThrow();
    expect(() => deserializeSnapshot(' '.repeat(MAX_SNAPSHOT_SIZE + 1))).toThrow(/larger than/);
  });

  it('decodes gzip and plain JSON files', async () => {
    const snapshot = serializeAdapters(createAdapters(), meta);
    expect(await decodeSnapshot(await encodeSnapshot(snapshot, true))).toEqual(snapshot);
    expect(await decodeSnapshot(await encodeSnapshot(snapshot, false))).toEqual(snapshot);
  });
});
