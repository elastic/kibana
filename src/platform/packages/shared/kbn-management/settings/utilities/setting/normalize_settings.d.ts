import type { SettingType, UiSetting, UiSettingMetadata } from '@kbn/management-settings-types';
type RawSettings = Record<string, UiSetting<SettingType>>;
/**
 * UiSettings have an extremely permissive set of types, which makes it difficult to code
 * against them.  The `type` and `value` properties are inherently related, and important,
 * but in some cases one or both are missing.  This function attempts to normalize the
 * settings to a strongly-typed format, {@link UiSettingMetadata} based on the information
 * in the setting at runtime.
 *
 * @param rawSettings The raw settings retrieved from the {@link IUiSettingsClient}, which
 * may be missing the `type` or `value` properties.
 * @returns A mapped collection of normalized {@link UiSetting} objects.
 */
export declare const normalizeSettings: (rawSettings: RawSettings) => Record<string, UiSettingMetadata>;
export {};
