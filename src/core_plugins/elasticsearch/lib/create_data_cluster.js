module.exports = function (server, esIsTribe) {
  const config = server.config();
  const esPlugins = server.plugins.elasticsearch;

  class ElasticsearchDataClientLogging {
    error(err) {
      server.log(['error', 'elasticsearch', 'data'], err);
    }
    warning(message) {
      server.log(['warning', 'elasticsearch', 'data'], message);
    }
    info() {}
    debug() {}
    trace() {}
    close() {}
  }

  function getConfig() {
    return Object.assign(
      {},
      config.get('elasticsearch'),
      config.get('elasticsearch.tribe'),
      { log: ElasticsearchDataClientLogging }
    );
  }

  return server.plugins.elasticsearch.createCluster('data', getConfig());
};
