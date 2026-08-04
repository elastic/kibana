import type { DiscoverSessionTabAttributes } from '@kbn/saved-search-plugin/server';
import type { DiscoverSessionApiTab } from '../schema';
type StoredVisContext = DiscoverSessionTabAttributes['visContext'];
type ApiVisContext = DiscoverSessionApiTab['vis_context'];
export interface StoredVisContextRequestData {
    dataViewId?: string;
    timeField?: string;
    timeInterval?: string;
    breakdownField?: string;
}
export declare const transformVisContextOut: (visContext: StoredVisContext) => ApiVisContext | undefined;
export declare const transformVisContextIn: (visContext: ApiVisContext, requestData?: StoredVisContextRequestData) => StoredVisContext;
export {};
