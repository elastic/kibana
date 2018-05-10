const Joi = require('joi');
const { MigrationPlan, Plugin, Opts } = require('./lib');

module.exports = {
  fromPlugins,
};

/**
 * Computes the index mappings defined by the specified set of plugins.
 *
 * @returns {Promise<Mappings>}
 */
function fromPlugins(plugins) {
  Joi.assert(plugins, Opts.pluginArraySchema);
  return MigrationPlan.buildMappings(Plugin.sanitize(plugins));
}
