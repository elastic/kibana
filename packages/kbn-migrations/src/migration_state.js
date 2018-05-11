const Joi = require('joi');
const { MigrationState, Opts } = require('./lib');

module.exports = {
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
