export declare const esqlDataSourceSchema: import("@kbn/config-schema").ObjectType<{
    type: import("@kbn/config-schema").Type<"esql">;
    /**
     * An ES|QL query that drives the data source. The query must produce a tabular result set;
     * column names from the result are used as field references.
     * Example: 'FROM logs-* | STATS count = COUNT(*) BY host.name'
     */
    query: import("@kbn/config-schema").Type<string>;
}>;
