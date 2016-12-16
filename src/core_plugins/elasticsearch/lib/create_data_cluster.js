import { bindKey } from 'lodash';

export default function (server) {
  const config = server.config();
  const esPlugins = server.plugins.elasticsearch;
  const { ElasticsearchClientLogging } = server.plugins.elasticsearch;

  class DataClientLogging extends ElasticsearchClientLogging {
    constructor() {
      super();

      this.tags = ['data'];
      this.logQueries = getConfig().logQueries;
    }
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
}
