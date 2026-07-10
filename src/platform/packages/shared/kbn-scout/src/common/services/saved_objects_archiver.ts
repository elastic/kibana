/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import Path from 'path';

import type { ToolingLog } from '@kbn/tooling-log';
import { REPO_ROOT } from '@kbn/repo-info';
import { ALL_SAVED_OBJECT_INDICES } from '@kbn/core-saved-objects-server';
import { createPromiseFromStreams, createConcatStream } from '@kbn/utils';
import { isGzip, createParseArchiveStreams, isSavedObjectIndex } from '@kbn/es-archiver/src/lib';
import type { EsClient } from '../../types';

/**
 * Sent with every request that touches the restricted `.kibana*` indices so
 * Elasticsearch treats the access as first-party (mirrors `@kbn/es-archiver`).
 */
const ES_CLIENT_HEADERS = { 'x-elastic-product-origin': 'kibana' } as const;

const BULK_CHUNK_SIZE = 1000;

interface ArchiveDocRecord {
  type: string;
  value: {
    index?: string;
    id?: string;
    source?: Record<string, unknown>;
  };
}

interface SavedObjectDoc {
  index: string;
  id: string;
  source: Record<string, unknown>;
}

export interface LoadSavedObjectsOptions {
  /**
   * Saved object types that are never purged before indexing the archive documents.
   * Defaults to `['space']`: spaces are typically provisioned/torn down by the tests
   * themselves (or belong to other suites sharing the cluster), so deleting unrelated
   * `space` documents would break them. Pass your own list to widen or narrow the
   * exemption.
   */
  preservedTypes?: readonly string[];
}

const resolveArchiveDir = (archivePath: string): string => {
  const dir = Path.resolve(REPO_ROOT, archivePath);
  let stats: Fs.Stats;
  try {
    stats = Fs.statSync(dir);
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(
        `Saved objects archive [${archivePath}] could not be resolved (relative to [${REPO_ROOT}])`
      );
    }
    throw error;
  }

  if (!stats.isDirectory()) {
    throw new Error(
      `Saved objects archive [${archivePath}] must be a directory containing a 'data.json' or 'data.json.gz' file`
    );
  }

  return dir;
};

/**
 * Reads an `@kbn/es-archiver` archive and returns its document records, verifying that
 * the archive is "saved objects data-only": every record must be a `doc` targeting one
 * of the Kibana saved object indices. Index definitions (`mappings.json`) and documents
 * for regular data indices are rejected — use `esArchiver.loadIfNeeded` for those.
 */
const readArchiveDocs = async (archivePath: string): Promise<SavedObjectDoc[]> => {
  const dir = resolveArchiveDir(archivePath);
  const files = Fs.readdirSync(dir).filter((name) => !name.startsWith('.'));

  const docs: SavedObjectDoc[] = [];
  for (const filename of files) {
    const records = await createPromiseFromStreams<ArchiveDocRecord[]>([
      Fs.createReadStream(Path.resolve(dir, filename)),
      ...createParseArchiveStreams({ gzip: isGzip(filename) }),
      createConcatStream([]),
    ]);

    for (const record of records) {
      // doc records use type 'doc' ('_doc' in older archives); anything else is an
      // index/data-stream definition, which a data-only saved objects archive must not have
      if (record.type === 'index' || record.type === 'data_stream') {
        throw new Error(
          `Saved objects archive [${archivePath}] contains a [${record.type}] record (in [${filename}]). ` +
            `Only data-only archives targeting the existing saved object indices are supported: remove index ` +
            `definitions (usually by deleting 'mappings.json') or load the archive with 'esArchiver.loadIfNeeded'.`
        );
      }

      const { index, id, source } = record.value;
      if (!index || !id || !source) {
        throw new Error(
          `Saved objects archive [${archivePath}] contains a malformed doc record (in [${filename}]): ${JSON.stringify(
            record.value
          ).slice(0, 200)}`
        );
      }

      if (!isSavedObjectIndex(index)) {
        throw new Error(
          `Saved objects archive [${archivePath}] contains a document for [${index}], which is not a ` +
            `Kibana saved object index. Load regular data indices with 'esArchiver.loadIfNeeded' instead.`
        );
      }

      docs.push({ index, id, source });
    }
  }

  return docs;
};

const chunk = <T>(items: readonly T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

const runBulk = async (
  esClient: EsClient,
  operations: object[],
  onError: (failures: string[]) => Error,
  extractOp: (item: Record<string, any>) => Record<string, any> | undefined,
  ignoredStatuses: readonly number[] = []
) => {
  for (const operationsChunk of chunk(operations, BULK_CHUNK_SIZE * 2)) {
    const response = await esClient.bulk(
      { operations: operationsChunk, refresh: true },
      { headers: ES_CLIENT_HEADERS }
    );
    if (response.errors) {
      const failures = response.items
        .map(extractOp)
        .filter((op) => op?.error && !ignoredStatuses.includes(op.status))
        .map((op) => `${op?._index}/${op?._id}: ${JSON.stringify(op?.error)}`);
      if (failures.length > 0) {
        throw onError(failures);
      }
    }
  }
};

/**
 * Purges every document of the given saved object types across the saved object indices.
 * This reproduces the pristine state FTR suites get from `esArchiver.load` (which cleans
 * the saved object indices before indexing) while staying scoped to the archive's own
 * types, so unrelated fixtures loaded by other suites sharing the cluster survive.
 */
const purgeArchiveTypes = async (
  esClient: EsClient,
  docs: SavedObjectDoc[],
  preservedTypes: readonly string[]
) => {
  const preserved = new Set(preservedTypes);
  const types = Array.from(
    new Set(
      docs
        .map((doc) => doc.source.type)
        .filter((type): type is string => typeof type === 'string' && !preserved.has(type))
    )
  );
  if (types.length === 0) {
    return;
  }

  await esClient.deleteByQuery(
    {
      index: [...ALL_SAVED_OBJECT_INDICES],
      conflicts: 'proceed',
      refresh: true,
      ignore_unavailable: true,
      query: { terms: { type: types } },
    },
    { headers: ES_CLIENT_HEADERS }
  );
};

/**
 * Loads a "saved objects data-only" es-archiver archive into the existing `.kibana*`
 * indices: purges any documents of the archive's own saved object types (see
 * {@link LoadSavedObjectsOptions.preservedTypes}), then bulk-indexes every archive
 * document. The target indices are never deleted or recreated, and no other saved
 * objects are touched, which keeps this safe on clusters shared with other suites.
 *
 * Requires a client that may write to the restricted saved object indices (see
 * `getEsClientForSystemIndices`).
 */
export const loadSavedObjectsArchive = async (
  esClient: EsClient,
  log: ToolingLog,
  archivePath: string,
  options?: LoadSavedObjectsOptions
): Promise<void> => {
  const docs = await readArchiveDocs(archivePath);
  if (docs.length === 0) {
    log.warning(`[${archivePath}] archive has no documents to load`);
    return;
  }

  await purgeArchiveTypes(esClient, docs, options?.preservedTypes ?? ['space']);

  const operations = docs.flatMap((doc) => [
    { index: { _index: doc.index, _id: doc.id } },
    doc.source,
  ]);

  await runBulk(
    esClient,
    operations,
    (failures) =>
      new Error(`Failed to load saved objects archive [${archivePath}]:\n${failures.join('\n')}`),
    (item) => item.index
  );

  log.debug(`[${archivePath}] loaded ${docs.length} saved object docs`);
};

/**
 * Deletes every document contained in a "saved objects data-only" archive from the
 * `.kibana*` indices. Documents that are already gone are ignored, but any other
 * per-document failure throws: a silently partial unload would leak archive fixtures
 * into later suites.
 */
export const unloadSavedObjectsArchive = async (
  esClient: EsClient,
  log: ToolingLog,
  archivePath: string
): Promise<void> => {
  const docs = await readArchiveDocs(archivePath);
  if (docs.length === 0) {
    return;
  }

  const operations = docs.map((doc) => ({ delete: { _index: doc.index, _id: doc.id } }));

  await runBulk(
    esClient,
    operations,
    (failures) =>
      new Error(`Failed to unload saved objects archive [${archivePath}]:\n${failures.join('\n')}`),
    (item) => item.delete,
    [404]
  );

  log.debug(`[${archivePath}] unloaded ${docs.length} saved object docs`);
};
