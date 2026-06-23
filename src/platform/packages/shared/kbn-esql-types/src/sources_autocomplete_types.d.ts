export interface IndicesAutocompleteResult {
    indices: IndexAutocompleteItem[];
}
export interface IndexAutocompleteItem {
    name: string;
    mode: 'lookup' | 'time_series' | string;
    aliases: string[];
}
export interface ESQLSourceResult {
    name: string;
    hidden: boolean;
    title?: string;
    description?: string;
    links?: Array<{
        label: string;
        url: string;
    }>;
    dataStreams?: Array<{
        name: string;
        title?: string;
    }>;
    type?: string;
}
interface ResolveIndexResponseItem {
    name: string;
    mode?: 'lookup' | 'time_series' | string;
    indices?: string[];
    aliases?: string[];
    attributes?: string[];
    backing_indices?: string[];
}
export interface ResolveIndexResponse {
    indices?: ResolveIndexResponseItem[];
    aliases?: ResolveIndexResponseItem[];
    data_streams?: ResolveIndexResponseItem[];
}
export interface EsqlView {
    name: string;
    query: string;
    description?: string;
    links?: Array<{
        label: string;
        url: string;
    }>;
    type?: string;
}
export interface EsqlViewsResult {
    views: EsqlView[];
}
export interface EsqlDataset {
    name: string;
    data_source: string;
    resource: string;
    description?: string;
    settings?: Record<string, unknown>;
}
export interface EsqlDatasetsResult {
    datasets: EsqlDataset[];
}
export {};
