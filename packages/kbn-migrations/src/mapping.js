const Joi = require('joi');
const { MigrationPlan, Plugins, Opts } = require('./lib');

module.exports = {
  fromPlugins,
};

/**
 * Computes the current mappings for the specified index. These mappings may not have been
 * applied yet, if the index is unmigrated. This function returns mappings for enabled
 * and disabled pugins unless the includeDisabledPlugins option is set to false
 *
 * @returns {Promise<Mappings>}
 */
function fromPlugins(plugins) {
  Joi.assert(plugins, Opts.pluginArraySchema);
  return MigrationPlan.buildMappings(Plugins.sanitize(plugins));
}
