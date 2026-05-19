import type { SerializableRecord } from '@kbn/utility-types';
import type { Filter } from '@kbn/es-query';
import type { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/public';
import type { DataViewSpec } from '@kbn/data-views-plugin/public';
export declare const DISCOVER_CONTEXT_APP_LOCATOR = "DISCOVER_CONTEXT_APP_LOCATOR";
export interface DiscoverContextAppLocatorParams extends SerializableRecord {
    index: string | DataViewSpec;
    rowId: string;
    columns?: string[];
    filters?: Filter[];
    referrer: string;
}
export type DiscoverContextAppLocator = LocatorPublic<DiscoverContextAppLocatorParams>;
export interface ContextHistoryLocationState {
    referrer: string;
    dataViewSpec?: DataViewSpec;
}
export type DiscoverContextAppLocatorGetLocation = LocatorDefinition<DiscoverContextAppLocatorParams>['getLocation'];
