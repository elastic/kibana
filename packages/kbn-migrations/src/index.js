const { MigrationStatus } = require('./lib');

module.exports = {
  MigrationStatus,
  MigrationState: require('./migration_state'),
  Mapping: require('./mapping'),
  Document: require('./document'),
  Migration: require('./migration'),
};
