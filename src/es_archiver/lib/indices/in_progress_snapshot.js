import { get } from 'lodash';

// see https://github.com/elastic/elasticsearch/blob/99f88f15c5febbca2d13b5b5fda27b844153bf1a/server/src/main/java/org/elasticsearch/cluster/SnapshotsInProgress.java#L313-L319
const TERMINAL_SNAPSHOT_STATUSES = [
  'SUCCESS',
  'FAILED',
  'ABORTED'
];

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
 * @param  {EsArchiverStats} stats
 * @param  {string} index the name of the index to look for
 * @return {Promise<undefined>}
 */
export async function waitForSnapshotCompletion(client, stats, index) {
  const isSnapshotInProgress = async (repository, snapshot) => {
    const { snapshots: [status] } = await client.snapshot.status({
      repository,
      snapshot,
    });

    return !TERMINAL_SNAPSHOT_STATUSES.includes(status.state);
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

    stats.waitingForInProgressSnapshot(index);
    while (await isSnapshotInProgress(repository, found.snapshot)) {
      // wait a bit before getting status again
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return;
  }
}
