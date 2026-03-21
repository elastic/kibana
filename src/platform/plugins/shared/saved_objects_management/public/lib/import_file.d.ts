import type { HttpStart, SavedObjectsImportResponse } from '@kbn/core/public';
import type { ImportMode } from '../management_section/objects_table/components/import_mode_control';
export declare function importFile(http: HttpStart, file: File, { createNewCopies, overwrite }: ImportMode): Promise<SavedObjectsImportResponse>;
