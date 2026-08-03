import { type AggregateQuery, type Query } from '@kbn/es-query';
import type { DataView, DataViewSpec } from '@kbn/data-views-plugin/common';
import { DataSourceType, type DataViewDataSource, type DiscoverDataSource, type EsqlDataSource } from './types';
export declare const createDataViewDataSource: ({ dataViewId, }: {
    dataViewId: string;
}) => DataViewDataSource;
export declare const createEsqlDataSource: () => EsqlDataSource;
export declare const createDataSource: ({ dataView, query, }: {
    dataView: DataView | DataViewSpec | string | undefined;
    query: Query | AggregateQuery | undefined;
}) => DataViewDataSource | EsqlDataSource | undefined;
export declare const isDataSourceType: <T extends DataSourceType>(dataSource: DiscoverDataSource | undefined, type: T) => dataSource is Extract<DiscoverDataSource, {
    type: T;
}>;
export declare const isDataViewSource: (dataSource: DiscoverDataSource | undefined) => dataSource is DataViewDataSource;
export declare const isEsqlSource: (dataSource: DiscoverDataSource | undefined) => dataSource is EsqlDataSource;
