import type { CustomRequestHandlerContext, RequestHandlerContext } from '@kbn/core/server';
import type { SavedQueryAttributes } from '../../common';
import type { SavedQueryRestResponse } from './route_types';
export interface InternalSavedQueryAttributes extends Omit<SavedQueryAttributes, 'filters' | 'timefilter'> {
    titleKeyword: string;
    filters?: SavedQueryAttributes['filters'] | null;
    timefilter?: SavedQueryAttributes['timefilter'] | null;
}
export declare function registerSavedQueryRouteHandlerContext(context: RequestHandlerContext): Promise<{
    isDuplicateTitle: ({ title, id }: {
        title: string;
        id?: string;
    }) => Promise<boolean>;
    create: (attrs: SavedQueryAttributes) => Promise<SavedQueryRestResponse>;
    update: (id: string, attrs: SavedQueryAttributes) => Promise<SavedQueryRestResponse>;
    get: (id: string) => Promise<SavedQueryRestResponse>;
    count: () => Promise<number>;
    find: ({ page, perPage, search }?: {
        page?: number | undefined;
        perPage?: number | undefined;
        search?: string | undefined;
    }) => Promise<{
        total: number;
        savedQueries: SavedQueryRestResponse[];
    }>;
    delete: (id: string) => Promise<{}>;
}>;
export type SavedQueryRouteHandlerContext = CustomRequestHandlerContext<{
    savedQuery: Promise<ReturnType<typeof registerSavedQueryRouteHandlerContext>>;
}>;
