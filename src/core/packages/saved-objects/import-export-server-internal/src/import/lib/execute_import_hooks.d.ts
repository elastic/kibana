import type { SavedObjectsImportWarning } from '@kbn/core-saved-objects-common';
import type { SavedObject, SavedObjectsImportHook } from '@kbn/core-saved-objects-server';
export interface ExecuteImportHooksOptions {
    objects: SavedObject[];
    importHooks: Record<string, SavedObjectsImportHook[]>;
}
export declare const executeImportHooks: ({ objects, importHooks, }: ExecuteImportHooksOptions) => Promise<SavedObjectsImportWarning[]>;
