import type { SavedObjectsBaseOptions } from './base';
/**
 * Options for the saved objects get operation
 *
 * @public
 */
export interface SavedObjectsGetOptions extends SavedObjectsBaseOptions {
    /** {@link SavedObjectsRawDocParseOptions.migrationVersionCompatibility} */
    migrationVersionCompatibility?: 'compatible' | 'raw';
}
