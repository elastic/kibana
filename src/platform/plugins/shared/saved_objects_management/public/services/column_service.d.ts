import type { SpacesApi } from '@kbn/spaces-plugin/public';
import type { SavedObjectsManagementColumn } from './types';
export interface SavedObjectsManagementColumnServiceSetup {
    /**
     * register given column in the registry.
     */
    register: (column: SavedObjectsManagementColumn) => void;
}
export interface SavedObjectsManagementColumnServiceStart {
    /**
     * return all {@link SavedObjectsManagementColumn | columns} currently registered.
     */
    getAll: () => SavedObjectsManagementColumn[];
}
export declare class SavedObjectsManagementColumnService {
    private readonly columns;
    setup(): SavedObjectsManagementColumnServiceSetup;
    start(spacesApi?: SpacesApi): SavedObjectsManagementColumnServiceStart;
    private register;
}
