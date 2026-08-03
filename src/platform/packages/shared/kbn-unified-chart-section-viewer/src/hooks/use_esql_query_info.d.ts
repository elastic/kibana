export interface EsqlQueryInfo {
    metricField: string | undefined;
    columns: string[];
    indices: string[];
    dimensions: string[];
    filters: string[];
    metadataFields: string[];
}
export declare const useEsqlQueryInfo: ({ query }: {
    query: string;
}) => EsqlQueryInfo;
