const _ = require('lodash');
const { MigrationPlan, MigrationContext, Plugins, Documents, Opts } = require('./lib');

module.exports = {
  transformDocuments,
};

const optsDefinition = {
  callCluster: 'function',
  index: 'string',
  docs: 'array',
  plugins: 'array',
  migrationState: 'object',
};

/**
 * Given a migration state (migrationState) and a set of documents (docs),
 * transforms those documents to be the same version as the index. If such a
 * transform is impossible, this will fail.
 * @param {ImportDocsOpts} opts
 */
async function transformDocuments(opts) {
  const context = await MigrationContext.fetch(Opts.validate(optsDefinition, opts));
  const { migrationState: exportedState, docs } = opts;
  const { plugins, migrationState } = context;
  const transformDoc = buildImportFunction(plugins, exportedState, migrationState);
  return docs.map(transformDoc);
}

function buildImportFunction(plugins, exportedState, migrationState) {
  const { migrations } = MigrationPlan.build(plugins, exportedState);
  const validateDoc = buildValidationFunction(plugins, exportedState, migrationState);
  const transformDoc = Documents.buildTransformFunction(migrations);

  return (doc) => transformDoc(validateDoc(doc));
}

// Unlike with index migrations, when we are importing documents, exportedState
// may contain plugins that the current system knows nothing about. Additionally,
// the exportedState may contain outdated versions of plugins which are now disabled
// and therefore the doc can't be migrated up to the state of the index.
function buildValidationFunction(plugins, exportedState, migrationState) {
  const previousPlugins = _.indexBy(exportedState.plugins, 'id');
  const currentPlugins = _.indexBy(migrationState.plugins, 'id');
  const propToPlugin = mapPropsToPlugin(previousPlugins, currentPlugins);
  const disabledIds = new Set(Plugins.disabledIds(plugins, migrationState));

  return (doc) => {
    const docPlugins = _(doc._source).keys().map(k => propToPlugin[k]).compact().uniq().value();
    const outOfDatePlugins = docPlugins.filter(({ id }) => isOutOfDate(previousPlugins[id], currentPlugins[id]));
    const disabledPlugin = outOfDatePlugins.find(({ id }) => disabledIds.has(id));
    const unknownPlugin = docPlugins.find(({ id }) => !currentPlugins[id]);

    if (disabledPlugin || unknownPlugin) {
      throw new Error(`Document "${doc._id}" requires unavailable plugin "${(disabledPlugin || unknownPlugin).id}"`);
    }

    return doc;
  };
}

function isOutOfDate(prevPlugin, currentPlugin) {
  return !currentPlugin ||
    !prevPlugin ||
    currentPlugin.migrationsChecksum !== prevPlugin.migrationsChecksum ||
    currentPlugin.mappingsChecksum !== prevPlugin.mappingsChecksum;
}

function mapPropsToPlugin(previousPlugins, currentPlugins) {
  const pluginProps = ({ mappings }) => mappings ? _.keys(JSON.parse(mappings)) : [];
  const pluginStates = _([_.values(currentPlugins), _.values(previousPlugins)]).flatten().compact();

  return pluginStates.reduce((acc, plugin) => {
    return _.reduce(pluginProps(plugin), (h, prop) => _.set(h, prop, plugin), acc);
  }, {});
}
