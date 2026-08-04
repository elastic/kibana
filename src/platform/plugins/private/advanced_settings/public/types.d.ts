import type { HomePublicPluginSetup } from '@kbn/home-plugin/public';
import type { ManagementSetup } from '@kbn/management-plugin/public';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import type { SectionRegistrySetup, SectionRegistryStart } from '@kbn/management-settings-section-registry';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
export type AdvancedSettingsSetup = SectionRegistrySetup;
export type AdvancedSettingsStart = SectionRegistryStart;
export interface AdvancedSettingsPluginSetup {
    management: ManagementSetup;
    home?: HomePublicPluginSetup;
    usageCollection?: UsageCollectionSetup;
}
export interface AdvancedSettingsPluginStart {
    spaces: SpacesPluginStart;
}
