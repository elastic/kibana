import type { PublishingSubject } from '@kbn/presentation-publishing';
import type { TimeRange } from '@kbn/es-query';
import type { Vis } from '../vis';
export declare function initializeEditApi({ customTimeRange$, description$, parentApi, savedObjectId$, searchSessionId$, title$, vis$, uuid, }: {
    customTimeRange$: PublishingSubject<TimeRange | undefined>;
    description$: PublishingSubject<string | undefined>;
    parentApi?: unknown;
    savedObjectId$: PublishingSubject<string | undefined>;
    searchSessionId$: PublishingSubject<string | undefined>;
    title$: PublishingSubject<string | undefined>;
    vis$: PublishingSubject<Vis>;
    uuid: string;
}): {
    getTypeDisplayName?: undefined;
    onEdit?: undefined;
    isEditingEnabled?: undefined;
} | {
    getTypeDisplayName: () => string;
    onEdit: () => Promise<void>;
    isEditingEnabled: () => boolean;
};
