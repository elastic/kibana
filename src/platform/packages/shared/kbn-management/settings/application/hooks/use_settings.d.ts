import type { UiSettingsScope } from '@kbn/core-ui-settings-common';
/**
 * React hook which retrieves settings from a particular {@link IUiSettingsClient},
 * normalizes them to a predictable format, {@link UiSettingMetadata}, and returns
 * them as an observed collection.
 * @param scope The {@link UiSettingsScope} of the settings to be retrieved.
 * @returns An array of settings metadata objects.
 */
export declare const useSettings: (scope: UiSettingsScope) => Record<string, import("@kbn/management-settings-types").UiSettingMetadata<import("@kbn/core-ui-settings-common").UiSettingsType, string | number | boolean | (string | number)[] | null | undefined>>;
