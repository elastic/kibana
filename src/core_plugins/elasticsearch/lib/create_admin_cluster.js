import { clientLogger } from './client_logger';

export function createAdminCluster(server) {
  const config = server.config();
  const ElasticsearchClientLogging = clientLogger(server);

  class AdminClientLogging extends ElasticsearchClientLogging {
    tags = ['admin'];
    logQueries = config.get('elasticsearch.logQueries');
  }

  server.plugins.elasticsearch.createCluster(
    'admin',
    Object.assign({ log: AdminClientLogging }, config.get('elasticsearch'))
  );
}
