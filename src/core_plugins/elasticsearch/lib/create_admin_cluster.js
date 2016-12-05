module.exports = function (server, esIsTribe) {
  const config = server.config();

  class ElasticsearchAdminClientLogging {
    error(err) {
      server.log(['error', 'elasticsearch', 'admin'], err);
    }
    warning(message) {
      server.log(['warning', 'elasticsearch', 'admin'], message);
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
      { log: ElasticsearchAdminClientLogging }
    );
  }

  return server.plugins.elasticsearch.createCluster('admin', getConfig());
};
