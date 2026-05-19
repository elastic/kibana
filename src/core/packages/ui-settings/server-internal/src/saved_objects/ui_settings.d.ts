import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
/**
 * The `config` object type contains many attributes that are defined by consumers.
 */
export interface ConfigAttributes {
    buildNum: number;
    [key: string]: unknown;
}
export declare const uiSettingsType: SavedObjectsType;
export declare const uiSettingsGlobalType: SavedObjectsType;
