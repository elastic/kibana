import SetupError from './setup_error';
import { mappings } from './kibana_index_mappings';

module.exports = function (server) {
  const { callWithInternalUser } = server.plugins.elasticsearch.getCluster('admin');
  const index = server.config().get('kibana.index');

  function handleError(message) {
    return function (err) {
      throw new SetupError(server, message, err);
    };
  }

  return callWithInternalUser('indices.create', {
    index: index,
    body: {
      settings: {
        number_of_shards: 1
      },
      mappings
    }
  })
  .catch(handleError('Unable to create Kibana index "<%= kibana.index %>"'))
  .then(function () {
    return callWithInternalUser('cluster.health', {
      waitForStatus: 'yellow',
      index: index
    })
    .catch(handleError('Waiting for Kibana index "<%= kibana.index %>" to come online failed.'));
  });
};
