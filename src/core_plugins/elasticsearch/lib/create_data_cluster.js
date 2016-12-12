import { bindKey } from 'lodash';

export default function (server) {
  const config = server.config();
  const esPlugins = server.plugins.elasticsearch;
  const Logger = server.plugins.elasticsearch.ElasticsearchClientLogging;

  class DataClientLogging extends Logger {
    tags = ['data'];
    logQueries = Boolean(getConfig().logQueries);
  }

  function getConfig() {
    const esConfig = config.get('elasticsearch.tribe');

    if (!Boolean(esConfig.url)) {
      return config.get('elasticsearch');
    }

    return esConfig;
  }

  const dataCluster = server.plugins.elasticsearch.createCluster(
    'data',
    Object.assign({ log: DataClientLogging }, getConfig())
  );

  server.on('close', bindKey(dataCluster, 'close'));
};
