import type { Reference } from '@kbn/content-management-utils';
import type { ISearchSource, RefreshInterval, SerializedSearchSourceFields, TimeRange } from '@kbn/data-plugin/common';
import type { SavedObjectReference } from '@kbn/core-saved-objects-server';
import type { SavedObjectsResolveResponse } from '@kbn/core/server';
import type { SerializableRecord } from '@kbn/utility-types';
import type { DataGridDensity } from '@kbn/unified-data-table';
import type { SortOrder } from '@kbn/discover-utils';
import type { DiscoverSessionTab as DiscoverSessionTabSchema } from '../server';
import type { VIEW_MODE } from '.';
export interface DiscoverGridSettings extends SerializableRecord {
    columns?: Record<string, DiscoverGridSettingsColumn>;
}
export interface DiscoverGridSettingsColumn extends SerializableRecord {
    width?: number;
}
export type VisContextUnmapped = {
    attributes: unknown;
    requestData: {
        dataViewId?: string;
        timeField?: string;
        timeInterval?: string;
        breakdownField?: string;
    };
    suggestionType: string;
} | {};
/** @internal **/
export interface SavedSearchAttributes {
    title: string;
    sort: SortOrder[];
    columns: string[];
    description: string;
    grid: DiscoverGridSettings;
    hideChart: boolean;
    hideTable: boolean;
    isTextBasedQuery: boolean;
    usesAdHocDataView?: boolean;
    kibanaSavedObjectMeta: {
        searchSourceJSON: string;
    };
    viewMode?: VIEW_MODE;
    hideAggregatedPreview?: boolean;
    rowHeight?: number;
    headerRowHeight?: number;
    timeRestore?: boolean;
    timeRange?: Pick<TimeRange, 'from' | 'to'>;
    refreshInterval?: RefreshInterval;
    rowsPerPage?: number;
    sampleSize?: number;
    breakdownField?: string;
    chartInterval?: string;
    density?: DataGridDensity;
    visContext?: VisContextUnmapped;
    controlGroupJson?: string;
    tabs: DiscoverSessionTabSchema[];
}
export type SavedSearchByValueAttributes = SavedSearchAttributes & {
    /** @deprecated References are now extracted/injected by server transforms */
    references?: Reference[];
};
/** @internal **/
export type { SortOrder } from '@kbn/discover-utils';
/** @public **/
export type SavedSearch = Partial<SavedSearchAttributes> & {
    searchSource: ISearchSource;
    id?: string;
    tags?: string[] | undefined;
    managed: boolean;
    references?: SavedObjectReference[];
    sharingSavedObjectProps?: {
        outcome?: SavedObjectsResolveResponse['outcome'];
        aliasTargetId?: SavedObjectsResolveResponse['alias_target_id'];
        aliasPurpose?: SavedObjectsResolveResponse['alias_purpose'];
        errorJSON?: string;
    };
};
/** @internal **/
export type SerializableSavedSearch = Omit<SavedSearch, 'searchSource'> & {
    serializedSearchSource?: SerializedSearchSourceFields;
};
export interface DiscoverSessionTab {
    id: string;
    label: string;
    sort: SortOrder[];
    columns: string[];
    grid: DiscoverGridSettings;
    hideChart: boolean;
    hideTable: boolean;
    isTextBasedQuery: boolean;
    usesAdHocDataView?: boolean;
    serializedSearchSource: SerializedSearchSourceFields;
    viewMode?: VIEW_MODE;
    hideAggregatedPreview?: boolean;
    rowHeight?: number;
    headerRowHeight?: number;
    timeRestore?: boolean;
    timeRange?: Pick<TimeRange, 'from' | 'to'>;
    refreshInterval?: RefreshInterval;
    rowsPerPage?: number;
    sampleSize?: number;
    breakdownField?: string;
    chartInterval?: string;
    density?: DataGridDensity;
    visContext?: VisContextUnmapped;
    controlGroupJson?: string;
}
export interface DiscoverSession {
    id: string;
    title: string;
    description: string;
    tabs: DiscoverSessionTab[];
    managed: boolean;
    tags?: string[] | undefined;
    references?: SavedObjectReference[];
    sharingSavedObjectProps?: {
        outcome?: SavedObjectsResolveResponse['outcome'];
        aliasTargetId?: SavedObjectsResolveResponse['alias_target_id'];
        aliasPurpose?: SavedObjectsResolveResponse['alias_purpose'];
        errorJSON?: string;
    };
}
