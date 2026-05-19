import type { Logger } from '@kbn/logging';
import type { SavedObjectsMigrationVersion } from '@kbn/core-saved-objects-common';
import type { SavedObjectUnsanitizedDoc, ISavedObjectTypeRegistry } from '@kbn/core-saved-objects-server';
import type { IDocumentMigrator, DocumentMigrateOptions, IsDowngradeRequiredOptions } from '@kbn/core-saved-objects-base-server-internal';
interface DocumentMigratorOptions {
    kibanaVersion: string;
    typeRegistry: ISavedObjectTypeRegistry;
    convertVersion?: string;
    log: Logger;
}
interface MigrationVersionParams {
    /**
     * Include deferred migrations in the migrationVersion.
     * @default true
     */
    includeDeferred?: boolean;
    /**
     * Migration type to use in the migrationVersion.
     * @default 'type'
     */
    migrationType?: 'core' | 'type';
}
/**
 * A concrete implementation of the {@link IDocumentMigrator} interface.
 */
export declare class DocumentMigrator implements IDocumentMigrator {
    private options;
    private migrations?;
    /**
     * Creates an instance of DocumentMigrator.
     *
     * @param {DocumentMigratorOptions} options
     * @prop {string} kibanaVersion - The current version of Kibana
     * @prop {SavedObjectTypeRegistry} typeRegistry - The type registry to get type migrations from
     * @prop {string} convertVersion - The version of Kibana in which documents can be converted to multi-namespace types
     * @prop {Logger} log - The migration logger
     */
    constructor(options: DocumentMigratorOptions);
    /**
     * Gets the latest pending version of each type.
     * Some migration objects won't have a latest migration version (they only contain reference transforms that are applied from other types).
     */
    getMigrationVersion({ includeDeferred, migrationType, }?: MigrationVersionParams): SavedObjectsMigrationVersion;
    /**
     * Prepares active migrations and document transformer function.
     */
    prepareMigrations(): void;
    /**
     * Migrates a document to the latest version.
     */
    migrate(doc: SavedObjectUnsanitizedDoc, { allowDowngrade, targetTypeVersion }?: DocumentMigrateOptions): SavedObjectUnsanitizedDoc;
    /**
     * Migrates a document to the latest version and applies type conversions if applicable. Also returns any additional document(s) that may
     * have been created during the transformation process.
     */
    migrateAndConvert(doc: SavedObjectUnsanitizedDoc): SavedObjectUnsanitizedDoc[];
    /**
     * Returns true if the provided document has a higher version that the `targetTypeVersion`
     * (defaulting to the last known version), false otherwise.
     */
    isDowngradeRequired(doc: SavedObjectUnsanitizedDoc, { targetTypeVersion }?: IsDowngradeRequiredOptions): boolean;
    private transform;
    private transformUp;
    private transformDown;
}
export {};
