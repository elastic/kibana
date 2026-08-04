import type { SerializableRecord } from '@kbn/utility-types';
interface MatchAllFilterMetaRestResponse extends FilterMetaRestResponse, SerializableRecord {
    field: string;
    formattedValue: string;
}
type PhrasesFilterMetaRestResponse = FilterMetaRestResponse & {
    params: PhraseFilterValue[];
    field?: string;
};
interface RangeFilterParamsRestResponse extends SerializableRecord {
    from?: number | string;
    to?: number | string;
    gt?: number | string;
    lt?: number | string;
    gte?: number | string;
    lte?: number | string;
    format?: string;
}
type RangeFilterMetaRestResponse = FilterMetaRestResponse & {
    params?: RangeFilterParamsRestResponse;
    field?: string;
    formattedValue?: string;
    type: 'range';
};
type PhraseFilterValue = string | number | boolean;
interface PhraseFilterMetaParamsRestResponse extends SerializableRecord {
    query: PhraseFilterValue;
}
type PhraseFilterMetaRestResponse = FilterMetaRestResponse & {
    params?: PhraseFilterMetaParamsRestResponse;
    field?: string;
    index?: string;
};
type FilterMetaParamsRestResponse = FilterRestResponse | FilterRestResponse[] | RangeFilterMetaRestResponse | RangeFilterParamsRestResponse | PhraseFilterMetaRestResponse | PhraseFilterMetaParamsRestResponse | PhrasesFilterMetaRestResponse | MatchAllFilterMetaRestResponse | string | string[] | boolean | boolean[] | number | number[];
interface QueryRestResponse {
    query: string | {
        [key: string]: any;
    };
    language: string;
}
type FilterMetaRestResponse = {
    alias?: string | null;
    disabled?: boolean;
    negate?: boolean;
    controlledBy?: string;
    group?: string;
    index?: string;
    isMultiIndex?: boolean;
    type?: string;
    key?: string;
    params?: FilterMetaParamsRestResponse;
    value?: string | RangeFilterParamsRestResponse | PhraseFilterValue[];
};
type FilterStateStoreRestResponse = 'appState' | 'globalState';
type FilterRestResponse = {
    $state?: {
        store: FilterStateStoreRestResponse;
    };
    meta: FilterMetaRestResponse;
    query?: Record<string, any>;
};
interface RefreshIntervalRestResponse {
    pause: boolean;
    value: number;
}
interface TimeRangeRestResponse {
    from: string;
    to: string;
    mode?: 'absolute' | 'relative';
}
type SavedQueryTimeFilterRestResponse = TimeRangeRestResponse & {
    refreshInterval: RefreshIntervalRestResponse;
};
export interface SavedQueryRestResponse {
    id: string;
    attributes: {
        filters?: FilterRestResponse[];
        title: string;
        description: string;
        query: QueryRestResponse;
        timefilter?: SavedQueryTimeFilterRestResponse | undefined;
    };
}
export {};
