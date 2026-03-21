import type { IconType } from '@elastic/eui';
import type { CanAddNewPanel } from '@kbn/presentation-publishing';
import type { FinderAttributes, SavedObjectCommon } from '@kbn/saved-objects-finder-plugin/common';
import type { SavedObjectMetaData } from '@kbn/saved-objects-finder-plugin/public';
export type RegistryItem<TSavedObjectAttributes extends FinderAttributes = FinderAttributes> = {
    onAdd: (container: CanAddNewPanel, savedObject: SavedObjectCommon<TSavedObjectAttributes>) => void;
    savedObjectMetaData: SavedObjectMetaData;
};
/**
 * Register saved object type in AddFromLibrary registry
 * Registered saved objects types are displayed in "Add from library" UIs
 */
export declare const registerAddFromLibraryType: <TSavedObjectAttributes extends FinderAttributes>({ onAdd, savedObjectType, savedObjectName, getIconForSavedObject, getSavedObjectSubType, getTooltipForSavedObject, }: {
    onAdd: RegistryItem["onAdd"];
    savedObjectType: string;
    savedObjectName: string;
    getIconForSavedObject: (savedObject: SavedObjectCommon<TSavedObjectAttributes>) => IconType;
    getSavedObjectSubType?: (savedObject: SavedObjectCommon<TSavedObjectAttributes>) => string;
    getTooltipForSavedObject?: (savedObject: SavedObjectCommon<TSavedObjectAttributes>) => string;
}) => void;
/**
 * React use hook for accessing saved object types from AddFromLibrary registry
 * @returns Array of saved object types from AddFromLibrary registry
 */
export declare function useAddFromLibraryTypes(): SavedObjectMetaData<FinderAttributes>[];
/**
 * Getter for accessing saved object type from AddFromLibrary registry
 * @param libraryType string
 * @returns registry item for saved object type
 */
export declare const getAddFromLibraryType: (libraryType: string) => RegistryItem<any> | undefined;
