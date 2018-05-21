const { MigrationStatus } = require('./lib');

module.exports = {
  MigrationStatus,
  Mapping: require('./mapping'),
  Document: require('./document'),
  Migration: require('./migration'),
};
