const Joi = require('joi');
const { MigrationPlan, Plugins, Opts } = require('./lib');

module.exports = {
  fromPlugins,
};

const optsSpec = Joi.object().unknown().keys({
  plugins: Opts.pluginArraySchema.required(),
});

/**
 * Computes the current mappings for the specified index. These mappings may not have been
 * applied yet, if the index is unmigrated. This function returns mappings for enabled
 * and disabled pugins unless the includeDisabledPlugins option is set to false
 *
 * @param {Object} opts
 * @returns {Promise<Mappings>}
 */
function fromPlugins(opts) {
  Joi.assert(opts, optsSpec);
  return MigrationPlan.buildMappings(Plugins.sanitize(opts.plugins), {}, false);
}
