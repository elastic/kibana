import { clientLogger } from './client_logger';

export function createDataCluster(server) {
  const config = server.config();
  const ElasticsearchClientLogging = clientLogger(server);

  class DataClientLogging extends ElasticsearchClientLogging {
    tags = ['data'];
    logQueries = getConfig().logQueries;
  }

  function getConfig() {
    if (Boolean(config.get('elasticsearch.tribe.url'))) {
      return config.get('elasticsearch.tribe');
    }

    return config.get('elasticsearch');
  }

  server.plugins.elasticsearch.createCluster(
    'data',
    {
      log: DataClientLogging,
      ...getConfig()
    }
  );
}
