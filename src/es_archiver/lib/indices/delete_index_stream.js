import { Transform } from 'stream';

import { get } from 'lodash';
import { isDeleteWhileSnapshotInProgressError, waitForSnapshotCompletion } from './in_progress_snapshot';

async function deleteIndex(client, stats, index, retryIfSnapshotInProgress = true) {
  try {
    await client.indices.delete({ index });
    stats.deletedIndex(index);
  } catch (error) {
    if (retryIfSnapshotInProgress && isDeleteWhileSnapshotInProgressError(error)) {
      stats.waitingForInProgressSnapshot(index);
      await waitForSnapshotCompletion(client, index);
      return await deleteIndex(client, stats, index, false);
    }

    if (get(error, 'body.error.type') !== 'index_not_found_exception') {
      throw error;
    }
  }
}

export function createDeleteIndexStream(client, stats) {
  return new Transform({
    readableObjectMode: true,
    writableObjectMode: true,
    async transform(record, enc, callback) {
      try {
        if (!record || record.type === 'index') {
          await deleteIndex(client, stats, record.value.index);
        } else {
          this.push(record);
        }
        callback();
      } catch (err) {
        callback(err);
      }
    }
  });
}
