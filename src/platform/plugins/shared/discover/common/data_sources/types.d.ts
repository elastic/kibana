export declare enum DataSourceType {
    DataView = "dataView",
    Esql = "esql"
}
export interface DataViewDataSource {
    type: DataSourceType.DataView;
    dataViewId: string;
}
export interface EsqlDataSource {
    type: DataSourceType.Esql;
}
export type DiscoverDataSource = DataViewDataSource | EsqlDataSource;
