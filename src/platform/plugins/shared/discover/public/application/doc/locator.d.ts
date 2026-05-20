import type { SerializableRecord } from '@kbn/utility-types';
import type { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/public';
import type { DataViewSpec } from '@kbn/data-views-plugin/public';
export declare const DISCOVER_SINGLE_DOC_LOCATOR = "DISCOVER_SINGLE_DOC_LOCATOR";
export interface DiscoverSingleDocLocatorParams extends SerializableRecord {
    index: string | DataViewSpec;
    rowId: string;
    rowIndex: string;
    referrer: string;
}
export type DiscoverSingleDocLocator = LocatorPublic<DiscoverSingleDocLocatorParams>;
export interface DocHistoryLocationState {
    referrer: string;
    dataViewSpec?: DataViewSpec;
}
export type DiscoverSingleDocLocatorGetLocation = LocatorDefinition<DiscoverSingleDocLocatorParams>['getLocation'];
