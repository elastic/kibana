export default function (server) {
  const config = server.config();
  const esPlugins = server.plugins.elasticsearch;
  const Logger = server.plugins.elasticsearch.ElasticsearchClientLogging;

  class DataClientLogging extends Logger {
    get tags() {
      return ['data'];
    }

    get logQueries() {
      return Boolean(getConfig().logQueries);
    }
  }

  function getConfig() {
    const esConfig = config.get('elasticsearch.tribe');

    if (!Boolean(esConfig.url)) {
      return config.get('elasticsearch');
    }

    return esConfig;
  }

  return server.plugins.elasticsearch.createCluster(
    'data',
    Object.assign({ log: DataClientLogging }, getConfig())
  );
};
