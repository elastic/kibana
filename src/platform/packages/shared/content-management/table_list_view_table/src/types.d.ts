export interface Tag {
    id?: string;
    name: string;
    description: string;
    color: string;
    managed: boolean;
}
export type TableRowAction = 'delete' | 'edit';
export type RowActions = {
    [action in TableRowAction]?: {
        enabled: boolean;
        reason?: string;
    };
};
export interface TableItemsRowActions {
    [id: string]: RowActions | undefined;
}
export interface SearchQueryError {
    message: string;
    name: string;
    queryText: string;
    containsForbiddenChars: boolean;
}
