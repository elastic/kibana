
export const HEALTH = {
  NO_INDEX: Symbol('the index is not in elasticsearch'),
  INITIALIZING: Symbol('the index is initializing'),
  READY: Symbol('the index is ready'),
};

/**
 *  Determine the health of an index in Elasticsearch
 *  @param {Object} options
 *  @property {Function} options.callCluster
 *  @property {string} options.index
 *  @return {Promise<HEALTH>}
 */
export async function getIndexHealth({ callCluster, index }) {
  const resp = await callCluster('cluster.health', {
    timeout: '5s', // tells es to not sit around and wait forever
    index: index,
    ignore: [408] // 408 comes back when we timeout
  });

  // if "timed_out" === true then elasticsearch could not
  // find any idices matching our filter within 5 seconds
  if (!resp || resp.timed_out) {
    return HEALTH.NO_INDEX;
  }

  // If status === "red" that means that index(es) were found
  // but the shards are not ready for queries
  if (resp.status === 'red') {
    return HEALTH.INITIALIZING;
  }

  return HEALTH.READY;
}
