import type { AdvancedSettingsSetup } from '@kbn/advanced-settings-plugin/public';
import type { TelemetryPluginSetup } from '@kbn/telemetry-plugin/public';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import type { CoreStart, CoreSetup } from '@kbn/core/public';
export interface TelemetryManagementSectionPluginDepsSetup {
    telemetry: TelemetryPluginSetup;
    advancedSettings: AdvancedSettingsSetup;
    usageCollection?: UsageCollectionSetup;
}
export declare class TelemetryManagementSectionPlugin {
    setup(core: CoreSetup, { advancedSettings, telemetry: { telemetryService }, usageCollection, }: TelemetryManagementSectionPluginDepsSetup): {};
    start(core: CoreStart): void;
}
