import type { StorageContext } from '../core';
import { ContentCrud } from '../core/crud';
import type { IContentClient } from './types';
interface Context<T = unknown> {
    crudInstance: ContentCrud<T>;
    storageContext: StorageContext;
}
export declare class ContentClient<T = unknown> implements IContentClient<T> {
    contentTypeId: string;
    private readonly ctx;
    static create<T = unknown>(contentTypeId: string, ctx: Context<T>): IContentClient<T>;
    constructor(token: symbol, contentTypeId: string, ctx: Context<T>);
    get(id: string, options: object): Promise<import("../core/crud").GetResponse<T, any>>;
    bulkGet(ids: string[], options: object): Promise<import("../core/crud").BulkGetResponse<T, any>>;
    create(data: object, options?: object): Promise<import("../core/crud").CreateItemResponse<T, any>>;
    update(id: string, data: object, options?: object): Promise<import("../core/crud").UpdateItemResponse<T, any>>;
    delete(id: string, options?: object): Promise<import("../core/crud").DeleteItemResponse>;
    search(query: object, options?: object): Promise<import("../core/crud").SearchResponse<T>>;
}
export {};
