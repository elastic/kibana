const Joi = require('joi');
const { MigrationPlan, Opts } = require('./lib');

module.exports = {
  fromPlugins,
};

/**
 * Computes the index mappings defined by the specified set of plugins.
 *
 * @param {FromPluginOpts}
 * @prop {Plugin[]} plugins - The array of migration plugins from which mappings will be extracted
 * @returns {Mappings}
 */
function fromPlugins({ plugins }) {
  Joi.assert(plugins, Opts.pluginArraySchema);
  return MigrationPlan.buildMappings(plugins);
}
