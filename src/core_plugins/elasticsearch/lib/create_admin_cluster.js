import { bindKey } from 'lodash';
import { clientLogger } from './client_logger';

export function createAdminCluster(server) {
  const config = server.config();
  const ElasticsearchClientLogging = clientLogger(server);

  class AdminClientLogging extends ElasticsearchClientLogging {
    tags = ['admin'];
    logQueries = config.get('elasticsearch.logQueries');
  }

  const adminCluster = server.plugins.elasticsearch.createCluster(
    'admin',
    Object.assign({ log: AdminClientLogging }, config.get('elasticsearch'))
  );

  server.on('close', bindKey(adminCluster, 'close'));
}
