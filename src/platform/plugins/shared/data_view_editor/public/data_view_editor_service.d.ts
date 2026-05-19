import type { HttpSetup } from '@kbn/core/public';
import type { Observable } from 'rxjs';
import type { DataViewsServicePublic } from '@kbn/data-views-plugin/public';
import { INDEX_PATTERN_TYPE } from '@kbn/data-views-plugin/public';
import type { ICPSManager } from '@kbn/cps-utils';
import type { RollupIndicesCapsResponse, RollupIndiciesCapability, MatchedIndicesSet, TimestampOption } from './types';
export declare const matchedIndiciesDefault: {
    allIndices: never[];
    exactMatchedIndices: never[];
    partialMatchedIndices: never[];
    visibleIndices: never[];
};
/**
 * ConstructorArgs for DataViewEditorService
 */
export interface DataViewEditorServiceConstructorArgs {
    /**
     * Dependencies for the DataViewEditorService
     */
    services: {
        http: HttpSetup;
        dataViews: DataViewsServicePublic;
        cpsManager?: ICPSManager;
    };
    /**
     * Whether service requires requireTimestampField
     */
    requireTimestampField?: boolean;
    /**
     * Initial type, indexPattern, and name to populate service
     */
    initialValues: {
        name?: string;
        type?: INDEX_PATTERN_TYPE;
        indexPattern?: string;
    };
}
export declare const stateSelectorFactory: <S>(state$: Observable<S>) => <R>(selector: (state: S) => R, equalityFn?: (arg0: R, arg1: R) => boolean) => Observable<R>;
export declare class DataViewEditorService {
    constructor({ services: { http, dataViews, cpsManager }, initialValues: { type: initialType, indexPattern: initialIndexPattern, name: initialName, }, requireTimestampField, }: DataViewEditorServiceConstructorArgs);
    private http;
    private dataViews;
    private requireTimestampField;
    private cpsManager?;
    private type;
    private indexPattern;
    private allowHidden;
    dataViewNames$: Observable<string[]>;
    private loadTimestampFieldsSub;
    private matchedIndicesForProviderSub;
    private rollupIndexForProviderSub;
    private cpsProjectRoutingSub?;
    private state$;
    rollupIndicesCaps$: Observable<RollupIndicesCapsResponse>;
    isLoadingSources$: Observable<boolean>;
    loadingTimestampFields$: Observable<boolean>;
    timestampFieldOptions$: Observable<TimestampOption[]>;
    rollupIndex$: Observable<string | undefined | null>;
    rollupCaps$: Observable<RollupIndiciesCapability | undefined>;
    private rollupIndexForProvider$;
    matchedIndices$: Observable<MatchedIndicesSet>;
    private matchedIndicesForProvider$;
    private rollupCapsResponse;
    private currentLoadingTimestampFields;
    private currentLoadingMatchedIndices;
    private updateState;
    private getRollupIndexCaps;
    private getIsRollupIndex;
    private loadMatchedIndices;
    setIndexPattern: (indexPattern: string) => void;
    setAllowHidden: (allowHidden: boolean) => void;
    setType: (type: INDEX_PATTERN_TYPE) => void;
    private loadIndices;
    private loadDataViewNames;
    private getIndicesMemory;
    private getIndicesCached;
    private timestampOptionsMemory;
    private getTimestampOptionsForWildcard;
    private getTimestampOptionsForWildcardCached;
    private loadTimestampFields;
    indexPatternValidationProvider: () => Promise<{
        rollupIndex: string | null;
        matchedIndices: MatchedIndicesSet;
    }>;
    destroy: () => void;
}
