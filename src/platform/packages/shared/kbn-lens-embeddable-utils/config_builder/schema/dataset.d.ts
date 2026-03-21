import { type TypeOf } from '@kbn/config-schema';
export declare const datasetTypeSchema: import("@kbn/config-schema").Type<Readonly<{} & {
    id: string;
    type: "dataView";
}> | Readonly<{
    time_field?: string | undefined;
    runtime_fields?: Readonly<{
        format?: any;
    } & {
        type: string;
        name: string;
    }>[] | undefined;
} & {
    type: "index";
    index: string;
}>>;
export declare const datasetSchema: {
    /**
     * The dataset configuration. Can be one of the following types:
     * - `dataView`: Use a Kibana data view as the data source. Requires a `name` property with the name of the data view.
     * - `index`: Use a Elasticsearch index as the data source. Requires an `index` property with the name of the index, and optionally a `time_field` property with the name of the time field in the index.
     * - `esql`: Use an ESQL query string as the data source. Requires a `query` property with the ESQL query string.
     * - `table`: Use a Kibana datatable object as the data source. Requires a `table` property with the Kibana datatable object, which should match the Kibana Datatable contract.
     */
    dataset: import("@kbn/config-schema").Type<Readonly<{} & {
        id: string;
        type: "dataView";
    }> | Readonly<{
        time_field?: string | undefined;
        runtime_fields?: Readonly<{
            format?: any;
        } & {
            type: string;
            name: string;
        }>[] | undefined;
    } & {
        type: "index";
        index: string;
    }>>;
};
export declare const datasetEsqlTableTypeSchema: import("@kbn/config-schema").Type<Readonly<{} & {
    type: "esql";
    query: string;
}> | Readonly<{
    table?: any;
} & {
    type: "table";
}>>;
export declare const datasetEsqlTableSchema: {
    dataset: import("@kbn/config-schema").Type<Readonly<{} & {
        type: "esql";
        query: string;
    }> | Readonly<{
        table?: any;
    } & {
        type: "table";
    }>>;
};
declare const anyDatasetSchema: import("@kbn/config-schema").Type<Readonly<{} & {
    id: string;
    type: "dataView";
}> | Readonly<{
    time_field?: string | undefined;
    runtime_fields?: Readonly<{
        format?: any;
    } & {
        type: string;
        name: string;
    }>[] | undefined;
} & {
    type: "index";
    index: string;
}> | Readonly<{} & {
    type: "esql";
    query: string;
}> | Readonly<{
    table?: any;
} & {
    type: "table";
}>>;
export type DatasetType = TypeOf<typeof anyDatasetSchema>;
export type DatasetTypeNoESQL = TypeOf<typeof datasetTypeSchema>;
export type DatasetTypeESQL = TypeOf<typeof datasetEsqlTableTypeSchema>;
export {};
