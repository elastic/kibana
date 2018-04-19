const { MigrationPlan, Plugins, Opts } = require('./lib');

module.exports = {
  activeMappings,
};

const optsDefinition = {
  plugins: 'array',
};

/**
 * Computes the current mappings for the specified index. These mappings may not have been
 * applied yet, if the index is unmigrated. This function returns mappings for enabled
 * and disabled pugins unless the includeDisabledPlugins option is set to false
 *
 * @param {MigrationOpts} opts
 * @returns {Promise<Mappings>}
 */
function activeMappings(opts) {
  const { plugins } = Opts.validate(optsDefinition, opts);
  return MigrationPlan.buildMappings(Plugins.sanitize(plugins), {}, false);
}
