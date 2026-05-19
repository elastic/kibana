import type { SerializableRecord } from '@kbn/utility-types';
import type { SavedObjectReference } from '@kbn/core/server';
import type { ShortUrlData } from '../../../common/url_service/short_urls/types';
/**
 * Interface used for persisting short URLs.
 */
export interface ShortUrlStorage {
    /**
     * Create and store a new short URL entry.
     */
    create<P extends SerializableRecord = SerializableRecord>(data: Omit<ShortUrlData<P>, 'id'>, options?: {
        references?: SavedObjectReference[];
    }): Promise<ShortUrlData<P>>;
    /**
     * Update an existing short URL entry.
     */
    update<P extends SerializableRecord = SerializableRecord>(id: string, data: Partial<Omit<ShortUrlData<P>, 'id'>>, options?: {
        references?: SavedObjectReference[];
    }): Promise<void>;
    /**
     * Fetch a short URL entry by ID.
     */
    getById<P extends SerializableRecord = SerializableRecord>(id: string): Promise<ShortUrlRecord<P>>;
    /**
     * Fetch a short URL entry by slug.
     */
    getBySlug<P extends SerializableRecord = SerializableRecord>(slug: string): Promise<ShortUrlRecord<P>>;
    /**
     * Checks if a short URL exists by slug.
     */
    exists(slug: string): Promise<boolean>;
    /**
     * Delete an existing short URL entry.
     */
    delete(id: string): Promise<void>;
}
export interface ShortUrlRecord<LocatorParams extends SerializableRecord = SerializableRecord> {
    data: ShortUrlData<LocatorParams>;
    references: SavedObjectReference[];
}
