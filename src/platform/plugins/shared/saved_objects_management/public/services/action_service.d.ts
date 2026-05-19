import type { SpacesApi } from '@kbn/spaces-plugin/public';
import type { SavedObjectsManagementAction } from './types';
export interface SavedObjectsManagementActionServiceSetup {
    /**
     * register given action in the registry.
     */
    register: (action: SavedObjectsManagementAction) => void;
}
export interface SavedObjectsManagementActionServiceStart {
    /**
     * return true if the registry contains given action, false otherwise.
     */
    has: (actionId: string) => boolean;
    /**
     * return all {@link SavedObjectsManagementAction | actions} currently registered.
     */
    getAll: () => SavedObjectsManagementAction[];
}
export declare class SavedObjectsManagementActionService {
    private readonly actions;
    setup(): SavedObjectsManagementActionServiceSetup;
    start(spacesApi?: SpacesApi): SavedObjectsManagementActionServiceStart;
    private register;
}
