import { bindKey } from 'lodash';

export default function (server) {
  const config = server.config();
  const { ElasticsearchClientLogging } = server.plugins.elasticsearch;

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
