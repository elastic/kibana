import { clientLogger } from './client_logger';

export function createDataCluster(server) {
  const config = server.config();
  const ElasticsearchClientLogging = clientLogger(server);

  class DataClientLogging extends ElasticsearchClientLogging {
    tags = ['data'];
    logQueries = getConfig().logQueries;
  }

  function getConfig() {
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
