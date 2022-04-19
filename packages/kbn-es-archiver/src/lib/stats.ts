/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ToolingLog } from '@kbn/tooling-log';
import { cloneDeep } from 'lodash';

export interface IndexStats {
  skipped: boolean;
  deleted: boolean;
  created: boolean;
  archived: boolean;
  waitForSnapshot: number;
  configDocs: {
    upgraded: number;
    tagged: number;
    upToDate: number;
  };
  docs: {
    indexed: number;
    archived: number;
  };
}

export type Stats = ReturnType<typeof createStats>;

export function createStats(name: string, log: ToolingLog) {
  const info = (msg: string, ...args: any[]) => log.info(`[${name}] ${msg}`, ...args);
  const debug = (msg: string, ...args: any[]) => log.debug(`[${name}] ${msg}`, ...args);

  const indices: Record<string, IndexStats> = {};
  const getOrCreate = (index: string) => {
    if (!indices[index]) {
      indices[index] = {
        skipped: false,
        deleted: false,
        created: false,
        archived: false,
        waitForSnapshot: 0,
        configDocs: {
          upgraded: 0,
          tagged: 0,
          upToDate: 0,
        },
        docs: {
          indexed: 0,
          archived: 0,
        },
      };
    }
    return indices[index];
  };

  return new (class Stats {
    /**
     * Record that an index was not restored because it already existed
     * @param index
     */
    public skippedIndex(index: string) {
      getOrCreate(index).skipped = true;
      info('Skipped restore for existing index %j', index);
    }

    /**
     * Record that the esArchiver waited for an index that was in the middle of being snapshotted
     * @param index
     */
    public waitingForInProgressSnapshot(index: string) {
      getOrCreate(index).waitForSnapshot += 1;
      info('Waiting for snapshot of %j to complete', index);
    }

    /**
     * Record that an index was deleted
     * @param index
     */
    public deletedIndex(index: string) {
      getOrCreate(index).deleted = true;
      info('Deleted existing index %j', index);
    }

    /**
     * Record that an index was created
     * @param index
     */
    public createdIndex(index: string, metadata: Record<string, any> = {}) {
      getOrCreate(index).created = true;
      info('Created index %j', index);
      Object.keys(metadata).forEach((key) => {
        debug('%j %s %j', index, key, metadata[key]);
      });
    }

    /**
     * Record that an index was written to the archives
     * @param index
     */
    public archivedIndex(index: string, metadata: Record<string, any> = {}) {
      getOrCreate(index).archived = true;
      info('Archived %j', index);
      Object.keys(metadata).forEach((key) => {
        debug('%j %s %j', index, key, metadata[key]);
      });
    }

    /**
     * Record that a document was written to elasticsearch
     * @param index
     */
    public indexedDoc(index: string) {
      getOrCreate(index).docs.indexed += 1;
    }

    /**
     * Record that a document was added to the archives
     * @param index
     */
    public archivedDoc(index: string) {
      getOrCreate(index).docs.archived += 1;
    }

    /**
     * Get a plain object version of the stats by index
     */
    public toJSON() {
      return cloneDeep(indices);
    }

    /**
     * Iterate the status for each index
     * @param fn
     */
    public forEachIndex(fn: (index: string, stats: IndexStats) => void) {
      const clone = this.toJSON();
      Object.keys(clone).forEach((index) => {
        fn(index, clone[index]);
      });
    }
  })();
}
