export default function (server) {
  const config = server.config();
  const Logger = server.plugins.elasticsearch.ElasticsearchClientLogging;

  class AdminClientLogging extends Logger {
    get tags() {
      return ['admin'];
    }

    get logQueries() {
      return Boolean(config.get('elasticsearch.logQueries'));
    }
  }

  return server.plugins.elasticsearch.createCluster(
    'admin',
    Object.assign({ log: AdminClientLogging }, config.get('elasticsearch'))
  );
};
