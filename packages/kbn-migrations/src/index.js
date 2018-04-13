const { fetchMigrationStatus } = require('./fetch_migration_status');
const { migrate } = require('./migrate');

module.exports = {
  fetchMigrationStatus,
  migrate,
};

/**
 * @typedef {'migrating' | 'migrated' | 'outOfDate'} MigrationStatus
*/

/**
 * @typedef {Object} MigrationBase
 * @property {string} id - The id of the migration
 */

/**
 * @typedef {{_id: string, _source: Object}} Document
*/

/**
 * @typedef {Document | Object} DocumentOrSource
*/

/**
 * @typedef {MigrationBase} MigrationSeed
 * @property {(() => DocumentOrSource)} seed - A function which returns a document to be inserted into the index
 */

/**
 * @typedef {MigrationBase} MigrationTransform
 * @property {((source: Object, doc: Document) => boolean)} filter - A function which specifies whether or not this migration applies to the specified document
 * @property {((source: Object, doc: Document) => DocumentOrSource)} transform - A function which transforms the specified source or document into a new shape
 */

/**
 * @typedef {MigrationSeed | MigrationTransform} Migration
 */

/**
 * A logical grouping of migrations and mappings
 * @typedef {Object} MigrationPlugin
 * @property {string} id - The id of the plugin (e.g. 'x-pack-kibana')
 * @property {Object} mappings - The properties that this plugin wishes to add to the index's mappings
 * @property {Migration[]} migrations - A (possiby empty) list of migrations
*/

/**
 * The options for running migrations or checking migration status
 * @typedef {Object} MigrationOpts
 * @property {KibanaServer} server - The Kibana server object, which contains a logger and an Elasticsearch connection
 * @property {MigrationPlugin[]} plugins - A list of plugins that define migrations and/or mappings
 * @property {string} index - The index or alias to be migrated
 * @property {string|undefined} destIndex - The name of the index to which index will be migrated. The destIndex must not exist prior to calling migrate.
 * @property {string|undefined} initialIndex - The name of the index that will be created if no index exists or if no alias exists.
 */
