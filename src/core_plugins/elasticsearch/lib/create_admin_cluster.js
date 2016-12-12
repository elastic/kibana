import { bindKey } from 'lodash';

export default function (server) {
  const config = server.config();
  const Logger = server.plugins.elasticsearch.ElasticsearchClientLogging;

  class AdminClientLogging extends Logger {
    tags = ['admin'];
    logQueries = Boolean(config.get('elasticsearch.logQueries'));
  }

  const adminCluster = server.plugins.elasticsearch.createCluster(
    'admin',
    Object.assign({ log: AdminClientLogging }, config.get('elasticsearch'))
  );

  server.on('close', bindKey(adminCluster, 'close'));
};
