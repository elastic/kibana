import { format } from 'util';
import { mappings } from './kibana_index_mappings';

module.exports = function (server) {
  const callAsKibanaUser = server.plugins.elasticsearch.getCluster('admin').callAsKibanaUser;
  const index = server.config().get('kibana.index');

  return callAsKibanaUser('indices.create', {
    index: index,
    body: {
      settings: {
        number_of_shards: 1
      },
      mappings
    }
  })
  .catch(() => {
    throw new Error(`Unable to create Kibana index "${index}"`);
  })
  .then(function () {
    return callAsKibanaUser('cluster.health', {
      waitForStatus: 'yellow',
      index: index
    })
    .catch(() => {
      throw new Error(`Waiting for Kibana index "${index}" to come online failed.`);
    });
  });
};
