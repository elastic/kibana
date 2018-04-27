const Joi = require('joi');
const { MigrationState, MigrationContext, Opts } = require('./lib');

module.exports = {
  fetchStatus,
};

const optsSchema = Joi.object().unknown().keys({
  callCluster: Opts.callClusterSchema.required(),
  index: Opts.indexSchema.required(),
  plugins: Opts.pluginArraySchema.required(),
});

/**
 * Checks whether or not the specified index is in need of migrations.
 *
 * @param {MigrationOpts} opts
 * @returns {Promise<MigrationStatus>}
 */
async function fetchStatus(opts) {
  Joi.assert(opts, optsSchema);
  const { plugins, migrationState } = await MigrationContext.fetch(opts);
  return MigrationState.status(plugins, migrationState);
}
