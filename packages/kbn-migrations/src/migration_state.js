const Joi = require('joi');
const { MigrationState, Opts } = require('./lib');

module.exports = {
  trimForExport(migrationState) {
    Joi.assert(migrationState, Opts.migrationStateSchema);
    return MigrationState.trimForExport(migrationState);
  },
};
