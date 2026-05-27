import type { HttpStart } from '@kbn/core/public';
import type { MatchedItem } from '.';
import { DataViewsService } from '.';
import type { DataViewsServiceDeps } from '../common/data_views/data_views';
import type { HasDataService } from '../common';
import type { ExistingIndicesResponse } from '../common/types';
/**
 * Data Views public service dependencies
 * @public
 */
export interface DataViewsServicePublicDeps extends DataViewsServiceDeps {
    /**
     * Get can user save data view - sync version
     */
    getCanSaveSync: () => boolean;
    /**
     * Has data service
     */
    hasData: HasDataService;
    getIndices: (props: {
        pattern: string;
        showAllIndices?: boolean;
        isRollupIndex: (indexName: string) => boolean;
        projectRouting?: string;
    }) => Promise<MatchedItem[]>;
    getRollupsEnabled: () => boolean;
    scriptedFieldsEnabled: boolean;
    http: HttpStart;
}
/**
 * Data Views public service
 * @public
 */
export declare class DataViewsServicePublic extends DataViewsService {
    getCanSaveSync: () => boolean;
    getIndices: (props: {
        pattern: string;
        showAllIndices?: boolean;
        isRollupIndex: (indexName: string) => boolean;
        projectRouting?: string;
    }) => Promise<MatchedItem[]>;
    hasData: HasDataService;
    private rollupsEnabled;
    private readonly http;
    readonly scriptedFieldsEnabled: boolean;
    /**
     * Constructor
     * @param deps Service dependencies
     */
    constructor(deps: DataViewsServicePublicDeps);
    getRollupsEnabled(): boolean;
    /**
     * Get existing index pattern list by providing string array index pattern list.
     * @param indices - index pattern list
     * @returns index pattern list of index patterns that match indices
     */
    getExistingIndices(indices: string[]): Promise<ExistingIndicesResponse>;
}
