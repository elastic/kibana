import type { DataView } from '@kbn/data-views-plugin/common';
import type { AggregateQuery, Query } from '@kbn/es-query';
import type { DiscoverDataSource } from '../../../common/data_sources';
import type { AsyncProfileProvider, ContextWithProfileId } from '../profile_service';
import { AsyncProfileService } from '../profile_service';
import type { Profile } from '../types';
import type { RootContext } from './root_profile';
/**
 * Indicates the category of the data source (e.g. logs, alerts, etc.)
 */
export declare enum DataSourceCategory {
    Traces = "traces",
    Metrics = "metrics",
    Logs = "logs",
    Default = "default"
}
/**
 * The data source profile interface
 */
export type DataSourceProfile = Profile;
/**
 * Parameters for the data source profile provider `resolve` method
 */
export interface DataSourceProfileProviderParams {
    /**
     * The current root context
     */
    rootContext: ContextWithProfileId<RootContext>;
    /**
     * The current data source
     */
    dataSource?: DiscoverDataSource;
    /**
     * The current data view
     */
    dataView?: DataView;
    /**
     * The current query
     */
    query?: Query | AggregateQuery;
}
/**
 * The resulting context object returned by the data source profile provider `resolve` method
 */
export interface DataSourceContext {
    /**
     * The category of the current data source
     */
    category: DataSourceCategory;
}
export type DataSourceProfileProvider<TProviderContext = {}> = AsyncProfileProvider<DataSourceProfile, DataSourceProfileProviderParams, DataSourceContext & TProviderContext>;
export declare class DataSourceProfileService extends AsyncProfileService<DataSourceProfileProvider> {
    constructor();
}
