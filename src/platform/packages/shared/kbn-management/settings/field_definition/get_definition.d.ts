import type { FieldDefinition, SettingType } from '@kbn/management-settings-types';
import type { UiSettingMetadata } from '@kbn/management-settings-types';
/**
 * The portion of the setting name that defines the category of the setting.
 */
export declare const CATEGORY_FIELD = "category";
/**
 * The default category for a setting, if not supplied.
 */
export declare const DEFAULT_CATEGORY = "general";
/**
 * Parameters for converting a {@link UiSettingMetadata} object into a {@link FieldDefinition}
 * for use in the UI.
 * @internal
 */
interface GetDefinitionParams<T extends SettingType> {
    /** The id of the field. */
    id: string;
    /** The source setting from Kibana. */
    setting: UiSettingMetadata<T>;
    /** Optional parameters */
    params?: {
        /** True if the setting it custom, false otherwise */
        isCustom?: boolean;
        /** True if the setting is overridden in Kibana, false otherwise. */
        isOverridden?: boolean;
    };
}
/**
 * Create a {@link FieldDefinition} from a {@link UiSettingMetadata} object for use
 * in the UI.
 *
 * @param parameters The {@link GetDefinitionParams} for creating the {@link FieldDefinition}.
 */
export declare const getFieldDefinition: <T extends SettingType>(parameters: GetDefinitionParams<T>) => FieldDefinition<T>;
export {};
