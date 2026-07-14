import type { ISavedObjectTypeRegistry, SavedObjectsType } from '@kbn/core-saved-objects-server';
import type { CoreUsageDataSetup, CoreIncrementUsageCounter } from '@kbn/core-usage-data-server';
import type { ICoreUsageStatsClient } from './usage_stats_client';
type SavedObjectTypeRegistry = ISavedObjectTypeRegistry & {
    registerType(type: SavedObjectsType): void;
};
/** @internal */
export interface InternalCoreUsageDataSetup extends CoreUsageDataSetup {
    registerType(typeRegistry: SavedObjectTypeRegistry): void;
    getClient(): ICoreUsageStatsClient;
    /** @internal {@link CoreIncrementUsageCounter} **/
    incrementUsageCounter: CoreIncrementUsageCounter;
}
export {};
