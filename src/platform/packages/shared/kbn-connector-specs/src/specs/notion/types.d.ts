export interface SearchByTitleInput {
    query: string;
    queryObjectType: 'page' | 'data_source';
    startCursor?: string;
    pageSize?: number;
}
export interface GetPageInput {
    pageId: string;
}
export interface GetDataSourceInput {
    dataSourceId: string;
}
export interface QueryDataSourceInput {
    dataSourceId: string;
    filter?: string;
    startCursor?: string;
    pageSize?: number;
}
