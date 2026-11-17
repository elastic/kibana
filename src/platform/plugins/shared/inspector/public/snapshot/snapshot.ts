/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod';
import { saveAs } from 'file-saver';
import type { Adapters, Request } from '../../common';
import { RequestAdapter, RequestStatus } from '../../common';
import type { SnapshotEnvironment } from './environment';
import { snapshotEnvironmentSchema } from './environment';

export const SNAPSHOT_VERSION = 1;
/** Upper bound of the (decompressed) snapshot text that is accepted on import. */
export const MAX_SNAPSHOT_SIZE = 50 * 1024 * 1024;

export interface InspectorSnapshotMeta extends SnapshotEnvironment {
  kibanaVersion: string;
  createdAt: string;
  appId?: string;
  title?: string;
  timezone?: string;
}

export interface InspectorSnapshot {
  version: typeof SNAPSHOT_VERSION;
  meta: InspectorSnapshotMeta;
  requests: Record<string, Request[]>;
  app?: { id: string; state: unknown };
}

/** A request adapter that can split its requests by the adapter they were recorded in. */
interface RequestsBySourceAdapter {
  getRequestsBySource: () => Record<string, Request[]>;
}

const hasRequestsBySource = (adapter: unknown): adapter is RequestsBySourceAdapter =>
  typeof (adapter as Partial<RequestsBySourceAdapter>)?.getRequestsBySource === 'function';

const requestSchema = lazySchema(() =>
  z.looseObject({
    id: z.string(),
    name: z.string(),
    startTime: z.number(),
    status: z.enum(RequestStatus),
    time: z.number().optional(),
    description: z.string().optional(),
    searchSessionId: z.string().optional(),
    replayKey: z.string().optional(),
    json: z.looseObject({}).optional(),
    stats: z.record(z.string(), z.looseObject({ label: z.string() })).optional(),
    response: z
      .looseObject({ json: z.looseObject({}).optional(), time: z.number().optional() })
      .optional(),
  })
);

const snapshotSchema = lazySchema(() =>
  z.object({
    version: z.literal(SNAPSHOT_VERSION),
    meta: z.looseObject({
      kibanaVersion: z.string(),
      createdAt: z.string(),
      appId: z.string().optional(),
      title: z.string().optional(),
      timezone: z.string().optional(),
      ...snapshotEnvironmentSchema,
    }),
    requests: z.record(z.string(), z.array(requestSchema)),
    app: z.object({ id: z.string(), state: z.unknown() }).optional(),
  })
);

const toPlainJson = <T>(value: T): T => JSON.parse(JSON.stringify(value));

/** Serializes every request adapter (by adapter name) plus optional app state into a snapshot. */
export const serializeAdapters = (
  adapters: Adapters,
  meta: InspectorSnapshotMeta,
  app?: InspectorSnapshot['app']
): InspectorSnapshot => {
  const requests: Record<string, Request[]> = {};
  Object.entries(adapters).forEach(([name, adapter]) => {
    if (hasRequestsBySource(adapter)) {
      Object.assign(requests, adapter.getRequestsBySource());
    } else if (adapter instanceof RequestAdapter) {
      requests[name] = adapter.getRequests();
    }
  });
  return toPlainJson({ version: SNAPSHOT_VERSION, meta, requests, ...(app ? { app } : {}) });
};

/** Validates snapshot text (size cap, version, schema). Throws a readable error otherwise. */
export const deserializeSnapshot = (text: string): InspectorSnapshot => {
  if (text.length > MAX_SNAPSHOT_SIZE) {
    throw new Error(`Snapshot is larger than ${MAX_SNAPSHOT_SIZE / 1024 / 1024} MB`);
  }
  const parsed = JSON.parse(text);
  if (parsed?.version !== SNAPSHOT_VERSION) {
    throw new Error(`Unsupported snapshot version: ${parsed?.version}`);
  }
  return snapshotSchema.parse(parsed) as InspectorSnapshot;
};

/** Rebuilds a RequestAdapter from recorded requests using the public responder API. */
export const createRequestAdapter = (requests: Request[]): RequestAdapter => {
  const adapter = new RequestAdapter();
  [...requests]
    .sort((a, b) => a.startTime - b.startTime)
    .forEach(({ id, name, description, searchSessionId, replayKey, startTime, ...req }) => {
      const responder = adapter.start(
        name,
        { id, description, searchSessionId, replayKey },
        startTime
      );
      if (req.json) responder.json(req.json);
      if (req.stats) responder.stats(req.stats);
      const response = { ...req.response, time: req.time };
      if (req.status === RequestStatus.OK) responder.ok(response);
      if (req.status === RequestStatus.ERROR) responder.error(response);
    });
  return adapter;
};

/** Returns one RequestAdapter per recorded adapter name. */
export const createRequestAdapters = (
  snapshot: InspectorSnapshot
): Record<string, RequestAdapter> =>
  Object.fromEntries(
    Object.entries(snapshot.requests).map(([name, requests]) => [
      name,
      createRequestAdapter(requests),
    ])
  );

const GZIP_MAGIC = [0x1f, 0x8b];

const pipeThrough = async (
  data: BlobPart,
  stream: CompressionStream | DecompressionStream
): Promise<Blob> => {
  const reader = new Blob([data]).stream().pipeThrough(stream).getReader();
  const chunks: BlobPart[] = [];
  for (let result = await reader.read(); !result.done; result = await reader.read()) {
    chunks.push(result.value);
  }
  return new Blob(chunks);
};

/** Encodes a snapshot as JSON, or as gzip through the native CompressionStream. */
export const encodeSnapshot = async (snapshot: InspectorSnapshot, gzip = false): Promise<Blob> => {
  const json = JSON.stringify(snapshot);
  if (!gzip) {
    return new Blob([json], { type: 'application/json' });
  }
  const compressed = await pipeThrough(json, new CompressionStream('gzip'));
  return new Blob([compressed], { type: 'application/gzip' });
};

/** Reads a JSON or gzip snapshot file and validates it. */
export const decodeSnapshot = async (file: Blob): Promise<InspectorSnapshot> => {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const isGzip = bytes[0] === GZIP_MAGIC[0] && bytes[1] === GZIP_MAGIC[1];
  const text = isGzip
    ? await (await pipeThrough(bytes, new DecompressionStream('gzip'))).text()
    : new TextDecoder().decode(bytes);
  return deserializeSnapshot(text);
};

export const downloadSnapshot = async (snapshot: InspectorSnapshot, gzip = false) => {
  const timestamp = snapshot.meta.createdAt.replace(/[:.]/g, '-');
  saveAs(
    await encodeSnapshot(snapshot, gzip),
    `inspector-snapshot-${timestamp}.json${gzip ? '.gz' : ''}`
  );
};
