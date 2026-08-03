import type { DocView } from './types';
export declare enum ElasticRequestState {
    Loading = 0,
    NotFound = 1,
    Found = 2,
    Error = 3,
    NotFoundDataView = 4
}
export declare class DocViewsRegistry {
    private docViews;
    constructor(initialValue?: DocViewsRegistry | DocView[]);
    getAll(): DocView<object>[];
    add(docView: DocView): void;
    removeById(id: string): void;
    enableById(id: string): void;
    disableById(id: string): void;
    clone(): DocViewsRegistry;
    private sortDocViews;
    private createDocView;
}
