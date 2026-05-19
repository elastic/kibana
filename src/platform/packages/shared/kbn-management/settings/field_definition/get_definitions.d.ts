import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import type { FieldDefinition, UiSettingMetadata } from '@kbn/management-settings-types';
type SettingsClient = Pick<IUiSettingsClient, 'isCustom' | 'isOverridden'>;
/**
 * Convenience function to convert settings taken from a UiSettingsClient into
 * {@link FieldDefinition} objects.
 *
 * @param settings The settings retreived from the UiSettingsClient.
 * @param client The client itself, used to determine if a setting is custom or overridden.
 * @returns An array of {@link FieldDefinition} objects.
 */
export declare const getFieldDefinitions: (settings: Record<string, UiSettingMetadata>, client: SettingsClient) => FieldDefinition[];
export {};
