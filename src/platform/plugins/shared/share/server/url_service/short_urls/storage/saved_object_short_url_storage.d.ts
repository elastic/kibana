import type { SerializableRecord } from '@kbn/utility-types';
import type { SavedObject, SavedObjectReference, SavedObjectsClientContract } from '@kbn/core/server';
import type { ShortUrlRecord } from '..';
import type { ShortUrlData } from '../../../../common/url_service/short_urls/types';
import type { ShortUrlStorage } from '../types';
export type ShortUrlSavedObject = SavedObject<ShortUrlSavedObjectAttributes>;
/**
 * Fields that stored in the short url saved object.
 */
export interface ShortUrlSavedObjectAttributes {
    /**
     * The slug of the short URL, the part after the `/` in the URL.
     */
    readonly slug?: string;
    /**
     * Number of times the short URL has been resolved.
     */
    readonly accessCount: number;
    /**
     * The timestamp of the last time the short URL was resolved.
     */
    readonly accessDate: number;
    /**
     * The timestamp when the short URL was created.
     */
    readonly createDate: number;
    /**
     * Serialized locator state.
     */
    readonly locatorJSON: string;
    /**
     * Legacy field - was used in old short URL versions. This field will
     * be removed in the future by a migration.
     *
     * @deprecated
     */
    readonly url: string;
}
export interface SavedObjectShortUrlStorageDependencies {
    savedObjectType: string;
    savedObjects: SavedObjectsClientContract;
}
export declare class SavedObjectShortUrlStorage implements ShortUrlStorage {
    private readonly dependencies;
    constructor(dependencies: SavedObjectShortUrlStorageDependencies);
    create<P extends SerializableRecord = SerializableRecord>(data: Omit<ShortUrlData<P>, 'id'>, { references }?: {
        references?: SavedObjectReference[];
    }): Promise<ShortUrlData<P>>;
    update<P extends SerializableRecord = SerializableRecord>(id: string, data: Partial<Omit<ShortUrlData<P>, 'id'>>, { references }?: {
        references?: SavedObjectReference[];
    }): Promise<void>;
    getById<P extends SerializableRecord = SerializableRecord>(id: string): Promise<ShortUrlRecord<P>>;
    getBySlug<P extends SerializableRecord = SerializableRecord>(slug: string): Promise<ShortUrlRecord<P>>;
    exists(slug: string): Promise<boolean>;
    delete(id: string): Promise<void>;
}
