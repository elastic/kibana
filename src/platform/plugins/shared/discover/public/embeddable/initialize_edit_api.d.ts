import type { FetchContext, HasEditCapabilities, PublishesDataViews, PublishesSavedObjectId, PublishingSubject } from '@kbn/presentation-publishing';
import type { DiscoverServices } from '../build_services';
import type { PublishesSavedSearch, PublishesSelectedTabId } from './types';
type SavedSearchPartialApi = PublishesSavedSearch & PublishesSavedObjectId & PublishesDataViews & {
    fetchContext$: PublishingSubject<FetchContext | undefined>;
};
export declare function getAppTarget(partialApi: SavedSearchPartialApi, discoverServices: DiscoverServices): Promise<{
    editPath: string;
    editUrl: string;
    urlWithoutLocationState: string;
}>;
export declare function initializeEditApi({ uuid, parentApi, partialApi, isEditable, discoverServices, getTitle, }: {
    uuid: string;
    parentApi?: unknown;
    partialApi: PublishesSavedSearch & PublishesSavedObjectId & PublishesSelectedTabId & PublishesDataViews & {
        fetchContext$: PublishingSubject<FetchContext | undefined>;
    };
    isEditable: () => boolean;
    getTitle: () => string | undefined;
    discoverServices: DiscoverServices;
}): HasEditCapabilities | undefined;
export {};
