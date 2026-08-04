import type { UiSettingMetadata, Value } from '@kbn/management-settings-types';
/**
 * Utility function to compare a value to the default value of a {@link UiSettingMetadata}.
 * @param setting The source {@link UiSettingMetadata} object.
 * @param userValue The value to compare to the setting's default value.  Default is the
 * {@link UiSettingMetadata}'s user value.
 * @returns True if the provided value is equal to the setting's default value, false otherwise.
 */
export declare const isSettingDefaultValue: (setting: UiSettingMetadata, userValue?: Value) => boolean;
