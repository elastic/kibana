const _ = require('lodash');
const Joi = require('joi');
const { MigrationPlan, MigrationContext, Plugin, Document, Opts } = require('./lib');

module.exports = {
  transform,
};

const optsSchema = Joi.object().unknown().keys({
  callCluster: Opts.callClusterSchema.required(),
  index: Opts.indexSchema.required(),
  plugins: Opts.pluginArraySchema.required(),
  docs: Opts.documentArraySchema.required(),
  migrationState: Opts.migrationStateSchema.required(),
});

/**
 * Given a migration state (migrationState) and a set of documents (docs),
 * transforms those documents to be the same version as the index. If such a
 * transform is impossible, this will fail.
 * @param {ImportDocsOpts} opts
 */
async function transform(opts) {
  Joi.assert(opts, optsSchema);
  const context = await MigrationContext.fetch(opts);
  const { migrationState: exportedState, docs } = opts;
  const { plugins, migrationState } = context;
  const transformDoc = buildImportFunction(plugins, exportedState, migrationState);
  return docs.map(transformDoc);
}

function buildImportFunction(plugins, exportedState, migrationState) {
  const { migrations } = MigrationPlan.build(plugins, exportedState);
  const validateDoc = buildValidationFunction(plugins, exportedState, migrationState);
  const transformDoc = Document.buildTransformFunction(migrations);

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
  const disabledIds = new Set(Plugin.disabledIds(plugins, migrationState));

  return (doc) => {
    const { id } = propToPlugin[doc.type];
    const requiresDisabledPlugin = isOutOfDate(previousPlugins[id], currentPlugins[id]) && disabledIds.has(id);
    const requiresUnknownPlugin = !currentPlugins[id];

    if (requiresDisabledPlugin || requiresUnknownPlugin) {
      throw new Error(`Document "${doc._id}" requires unavailable plugin "${id}"`);
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
