import { get } from 'lodash';

// see https://github.com/elastic/elasticsearch/blob/99f88f15c5febbca2d13b5b5fda27b844153bf1a/server/src/main/java/org/elasticsearch/cluster/SnapshotsInProgress.java#L313-L319
const PENDING_SNAPSHOT_STATUSES = [
  'INIT',
  'STARTED',
  'WAITING',
];

export async function deleteIndex(options) {
  const {
    client,
    stats,
    index,
    log,
    retryIfSnapshottingCount = 3
  } = options;

  try {
    await client.indices.delete({ index });
    stats.deletedIndex(index);
  } catch (error) {

    if (retryIfSnapshottingCount > 0 && isDeleteWhileSnapshotInProgressError(error)) {
      stats.waitingForInProgressSnapshot(index);
      await waitForSnapshotCompletion(client, index, log);
      return await deleteIndex({
        ...options,
        retryIfSnapshottingCount: retryIfSnapshottingCount - 1
      });
    }

    if (get(error, 'body.error.type') !== 'index_not_found_exception') {
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
export function isDeleteWhileSnapshotInProgressError(error) {
  return get(error, 'body.error.reason', '')
    .startsWith('Cannot delete indices that are being snapshotted');
}

/**
 * Wait for the any snapshot in any respository that is
 * snapshotting this index to complete.
 *
 * @param  {EsClient} client
 * @param  {string} index the name of the index to look for
 * @return {Promise<undefined>}
 */
export async function waitForSnapshotCompletion(client, index, log) {
  const isSnapshotPending = async (repository, snapshot) => {
    const { snapshots: [status] } = await client.snapshot.status({
      repository,
      snapshot,
    });

    log.debug(`Snapshot ${repository}/${snapshot} is ${status.state}`);
    return PENDING_SNAPSHOT_STATUSES.includes(status.state);
  };

  const getInProgressSnapshots = async (repository) => {
    const { snapshots: inProgressSnapshots } = await client.snapshot.get({
      repository,
      snapshot: '_current'
    });
    return inProgressSnapshots;
  };

  for (const repository of Object.keys(await client.snapshot.getRepository())) {
    const allInProgress = await getInProgressSnapshots(repository);
    const found = allInProgress.find(s => s.indices.includes(index));

    if (!found) {
      continue;
    }

    while (await isSnapshotPending(repository, found.snapshot)) {
      // wait a bit before getting status again
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return;
  }
}
