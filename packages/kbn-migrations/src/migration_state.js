const Joi = require('joi');
const _ = require('lodash');
const { MigrationState, Opts, MigrationStatus } = require('./lib');

const fetchStatusOpts = Joi.object().unknown().keys({
  callCluster: Opts.callClusterSchema.required(),
  index: Opts.indexSchema.required(),
});

module.exports = {
  /**
   * An efficient fetch of the migration status that is stored in the index.
   * @param {FetchStatusOpts} opts
   * @prop {function} callCluster - The ElasticSearch connection
   * @prop {string} index - The index whose status is being fetched
   * @returns {Promise<MigrationStatus>} - The migration status (migrating | migrated | outOfDate)
   */
  async fetchStatus(opts) {
    Joi.assert(opts, fetchStatusOpts);
    const { callCluster, index } = opts;
    const migrationState = await callCluster({ index, type: 'doc', id: MigrationState.ID, _source: ['migration.status'] });
    return _.get(migrationState, '_source.migration.status', MigrationStatus.outOfDate);
  },

  /**
   * Trims the specified migration state for more efficient storage in an exported file.
   * @param {MigrationState} migrationState
   * @returns {MigrationState} - The migration state object with optional properties removed.
   */
  trimForExport(migrationState) {
    Joi.assert(migrationState, Opts.migrationStateSchema);
    return MigrationState.trimForExport(migrationState);
  },
};
