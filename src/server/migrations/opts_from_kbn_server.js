import _ from 'lodash';

export function optsFromKbnServer({ pluginSpecs, server, version }, callCluster) {
  const plugins = pluginSpecs
    .map((plugin) => ({
      id: plugin.getId(),
      mappings: _.get(plugin.getExportSpecs(), 'mappings'),
      migrations: plugin.getMigrations(),
    }));
  return {
    plugins,
    elasticVersion: version,
    index: server.config().get('kibana.index'),
    log: (...args) => server.log(...args),
    callCluster: callCluster || server.plugins.elasticsearch.getCluster('admin').callWithInternalUser,
  };
}
