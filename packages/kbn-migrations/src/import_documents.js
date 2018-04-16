const _ = require('lodash');
const { MigrationContext, Persistence, Plugins, Documents, Opts } = require('./lib');

module.exports = {
  importDocuments,
};

const optsDefinition = {
  callCluster: 'function',
  index: 'string',
  docs: 'array',
  plugins: 'array',
  exportedState: 'object',
  log: 'function',
};

/**
 * Imports one or more documents, migrating them to the latest version of the index,
 * if possible. If migration is not possible, this will throw an exception.
 * @param {ImportDocsOpts} opts
 */
async function importDocuments(opts) {
  const context = await MigrationContext.fetch(Opts.validate(optsDefinition, opts));
  const { exportedState, docs } = opts;
  const { callCluster, log, index, plugins, migrationState } = context;
  const transformDoc = buildImportFunction(plugins, exportedState, migrationState);
  return await Persistence.bulkInsert(callCluster, log, index, docs.map(transformDoc));
}

function buildImportFunction(plugins, exportedState, migrationState) {
  const migrations = migrationsForImport(plugins, exportedState);
  const validateDoc = buildValidationFunction(plugins, exportedState, migrationState);
  const transformDoc = Documents.buildTransformFunction(migrations);

  return (doc) => transformDoc(validateDoc(doc));
}

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

function migrationsForImport(plugins, exportedState) {
  const previousPlugins = _.indexBy(exportedState.plugins, 'id');
  return _(plugins)
    .map(({ id, migrations }) => _.slice(migrations, _.get(previousPlugins, [id, 'migrationIds'], []).length))
    .flatten()
    .compact()
    .value();
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
