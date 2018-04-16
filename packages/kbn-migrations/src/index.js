const { fetchMigrationStatus } = require('./fetch_migration_status');
const { migrate } = require('./migrate');
const { importDocuments } = require('./import_documents');

module.exports = {
  fetchMigrationStatus,
  migrate,
  importDocuments,
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
 * @property {((command: string, opts: any) => Promise<any>)} callCluster - A propery secured function that calls Elastic search
 * @property {MigrationPlugin[]} plugins - A list of plugins that define migrations and/or mappings
 * @property {string} elasticVersion - The version of Elasticsearch being written to
 * @property {((meta: string[], message: string) => void)} log - A function which logs info and debug messages
 * @property {string} index - The index or alias to be migrated
 * @property {string|undefined} destIndex - The name of the index to which index will be migrated. The destIndex must not exist prior to calling migrate.
 * @property {string|undefined} initialIndex - The name of the index that will be created if no index exists or if no alias exists.
 */

/**
 * The options for importing documents
 * @typedef {Object} ImportDocsOpts
 * @property {((command: string, opts: any) => Promise<any>)} callCluster - A propery secured function that calls Elastic search
 * @property {((meta: string[], message: string) => void)} log - A function which logs info and debug messages
 * @property {string} index - The index or alias to be migrated
 * @property {Document[]} docs - The raw documents being imported
 * @property {MigrationState} exportedState - The migration state associated with the documents, or an empty object
 */
