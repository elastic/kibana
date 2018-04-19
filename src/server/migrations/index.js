// Adds Kibana-index-specific migration logic to the kbnServer object.
import _ from 'lodash';
import Migrations from '@kbn/migrations';

export async function migrationsMixin(kbnServer, server) {
  server.decorate('server', 'migrations', ({ callCluster } = {}) => {
    return {
      getMappings() {
        const { plugins } = optsFromKbnServer(kbnServer, _.noop);
        return Migrations.activeMappings({ plugins });
      },

      fetchStatus() {
        return Migrations.fetchStatus(optsFromKbnServer(kbnServer, callCluster));
      },

      migrate() {
        return Migrations.migrate(optsFromKbnServer(kbnServer, callCluster));
      },

      fetchMigrationState() {
        return Migrations.fetchMigrationState(optsFromKbnServer(kbnServer, callCluster));
      },

      importDocuments({ exportedState, docs }) {
        return Migrations.importDocuments({
          ...optsFromKbnServer(kbnServer, callCluster),
          exportedState,
          docs,
        });
      },
    };
  });
}

function optsFromKbnServer({ uiExports, server, version }, callCluster) {
  const pluginMappings = _.indexBy(uiExports.savedObjectMappings, 'pluginId');
  const plugins = _.map(server.plugins, (plugin, id) => ({
    id,
    mappings: _.get(pluginMappings, [id, 'properties']),
    migrations: plugin.migrations,
  }));
  return {
    plugins,
    elasticVersion: version,
    index: server.config().get('kibana.index'),
    log: (...args) => server.log(...args),
    callCluster: callCluster || server.plugins.elasticsearch.getCluster('admin').callWithInternalUser,
  };
}

