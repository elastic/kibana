import { format } from 'util';
import { mappings } from './kibana_index_mappings';

module.exports = function (server) {
  const client = server.plugins.elasticsearch.client;
  const index = server.config().get('kibana.index');

  return client.indices.create({
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
    return client.cluster.health({
      waitForStatus: 'yellow',
      index: index
    })
    .catch(() => {
      throw new Error(`Waiting for Kibana index "${index}" to come online failed.`);
    });
  });
};
