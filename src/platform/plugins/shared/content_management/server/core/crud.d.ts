import type { GetResult, BulkGetResult, CreateResult, UpdateResult, DeleteResult, SearchResult, SearchQuery } from '../../common';
import type { EventBus } from './event_bus';
import type { ContentStorage, StorageContext } from './types';
export interface GetResponse<T = unknown, M = void> {
    contentTypeId: string;
    result: GetResult<T, M>;
}
export interface BulkGetResponse<T = unknown, M = void> {
    contentTypeId: string;
    result: BulkGetResult<T, M>;
}
export interface CreateItemResponse<T = unknown, M = void> {
    contentTypeId: string;
    result: CreateResult<T, M>;
}
export interface UpdateItemResponse<T = unknown, M = void> {
    contentTypeId: string;
    result: UpdateResult<T, M>;
}
export interface DeleteItemResponse {
    contentTypeId: string;
    result: DeleteResult;
}
export interface SearchResponse<T = unknown> {
    contentTypeId: string;
    result: SearchResult<T>;
}
export declare class ContentCrud<T = unknown> {
    private storage;
    private eventBus;
    contentTypeId: string;
    constructor(contentTypeId: string, contentStorage: ContentStorage<T>, { eventBus, }: {
        eventBus: EventBus;
    });
    get(ctx: StorageContext, contentId: string, options?: object): Promise<GetResponse<T, any>>;
    bulkGet(ctx: StorageContext, ids: string[], options?: object): Promise<BulkGetResponse<T, any>>;
    create(ctx: StorageContext, data: object, options?: object): Promise<CreateItemResponse<T, any>>;
    update(ctx: StorageContext, id: string, data: object, options?: object): Promise<UpdateItemResponse<T, any>>;
    delete(ctx: StorageContext, id: string, options?: object): Promise<DeleteItemResponse>;
    search(ctx: StorageContext, query: SearchQuery, options?: object): Promise<SearchResponse<T>>;
}
