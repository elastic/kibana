/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Client } from '@elastic/elasticsearch';
import { ToolingLog } from '@kbn/tooling-log';
import { Stats } from '../stats';
import { ES_CLIENT_HEADERS } from '../../client_headers';

// see https://github.com/elastic/elasticsearch/blob/99f88f15c5febbca2d13b5b5fda27b844153bf1a/server/src/main/java/org/elasticsearch/cluster/SnapshotsInProgress.java#L313-L319
const PENDING_SNAPSHOT_STATUSES = ['INIT', 'STARTED', 'WAITING'];

export async function deleteIndex(options: {
  client: Client;
  stats: Stats;
  index: string | string[];
  log: ToolingLog;
  retryIfSnapshottingCount?: number;
}): Promise<void> {
  const { client, stats, log, retryIfSnapshottingCount = 10 } = options;
  const indices = [options.index].flat();

  const getIndicesToDelete = async () => {
    const resp = await client.indices.getAlias(
      {
        name: indices,
      },
      {
        ignore: [404],
        headers: ES_CLIENT_HEADERS,
        meta: true,
      }
    );

    return resp.statusCode === 404 ? indices : Object.keys(resp.body);
  };

  try {
    const indicesToDelete = await getIndicesToDelete();
    await client.indices.delete(
      { index: indicesToDelete },
      {
        headers: ES_CLIENT_HEADERS,
      }
    );
    for (const index of indices) {
      stats.deletedIndex(index);
    }
  } catch (error) {
    if (retryIfSnapshottingCount > 0 && isDeleteWhileSnapshotInProgressError(error)) {
      for (const index of indices) {
        stats.waitingForInProgressSnapshot(index);
      }
      await waitForSnapshotCompletion(client, indices, log);
      return await deleteIndex({
        ...options,
        retryIfSnapshottingCount: retryIfSnapshottingCount - 1,
      });
    }

    if (error?.meta?.body?.error?.type !== 'index_not_found_exception') {
      throw error;
    }
  }
}

/**
 * Determine if an error is complaining about a delete while
 * a snapshot is in progress
 * @param  {Error} error
 * @return {Boolean}
 */
export function isDeleteWhileSnapshotInProgressError(error: any) {
  return (error?.meta?.body?.error?.reason ?? '').startsWith(
    'Cannot delete indices that are being snapshotted'
  );
}

/**
 * Wait for the any snapshot in any repository that is
 * snapshotting this index to complete.
 */
export async function waitForSnapshotCompletion(
  client: Client,
  index: string | string[],
  log: ToolingLog
) {
  const isSnapshotPending = async (repository: string, snapshot: string) => {
    const {
      snapshots: [status],
    } = await client.snapshot.status(
      {
        repository,
        snapshot,
      },
      {
        headers: ES_CLIENT_HEADERS,
      }
    );

    log.debug(`Snapshot ${repository}/${snapshot} is ${status.state}`);
    return PENDING_SNAPSHOT_STATUSES.includes(status.state);
  };

  const getInProgressSnapshots = async (repository: string) => {
    const { snapshots: inProgressSnapshots } = await client.snapshot.get(
      {
        repository,
        snapshot: '_current',
      },
      {
        headers: ES_CLIENT_HEADERS,
      }
    );

    return inProgressSnapshots;
  };

  const repositoryMap = await client.snapshot.getRepository({});
  for (const repository of Object.keys(repositoryMap)) {
    const allInProgress = await getInProgressSnapshots(repository);
    const found = allInProgress?.find((s: any) => s.indices.includes(index));

    if (!found) {
      continue;
    }

    while (await isSnapshotPending(repository, found.snapshot)) {
      // wait a bit before getting status again
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    return;
  }
}
