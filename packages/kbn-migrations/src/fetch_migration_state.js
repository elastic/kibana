const Joi = require('joi');
const { MigrationState, Opts } = require('./lib');

module.exports = {
  fetchMigrationState,
};

const optsSchema = Joi.object().unknown().keys({
  callCluster: Opts.callClusterSchema.required(),
  index: Opts.indexSchema.required(),
});

/**
 * Gets the currently stored migration state for the specified index.
 *
 * @param {MigrationOpts} opts
 * @returns {Promise<MigrationStatus>}
 */
async function fetchMigrationState(opts) {
  Joi.assert(opts, optsSchema);
  const { callCluster, index } = opts;
  const { migrationState } = await MigrationState.fetch(callCluster, index);
  return migrationState;
}
