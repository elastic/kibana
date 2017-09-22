/**
 *  Create an index in Elasticsearch and wait for it to come online.
 *  @param {Object} options
 *  @property {Function} options.callCluster
 *  @property {string} options.index
 *  @property {MappingDsl} options.mappingsDsl
 *  @return {Promise<undefined>}
 */
export async function createIndex({ callCluster, index, mappingsDsl }) {
  try {
    await callCluster('indices.create', {
      index,
      body: {
        settings: {
          number_of_shards: 1
        },
        mappings: mappingsDsl
      }
    });
  } catch (error) {
    throw new Error(`Unable to create Kibana index "${index}"`);
  }

  try {
    await callCluster('cluster.health', {
      index,
      waitForStatus: 'yellow',
    });
  } catch (error) {
    throw new Error(`Waiting for Kibana index "${index}" to come online failed.`);
  }
}
