import type { SavedObjectsClientContract, SavedObject } from '@kbn/core/server';
import type { DataViewAttributes, PersistenceAPI, SavedObjectsClientCommonFindArgs } from '../common/types';
import type { DataViewCrudTypes } from '../common/content_management';
export declare class SavedObjectsClientWrapper implements PersistenceAPI {
    private savedObjectClient;
    constructor(savedObjectClient: SavedObjectsClientContract);
    find<T = unknown>(options: SavedObjectsClientCommonFindArgs): Promise<import("@kbn/core/server").SavedObjectsFindResult<T>[]>;
    get<T = unknown>(id: string): Promise<SavedObject<T>>;
    getSavedSearch<T = unknown>(id: string): Promise<SavedObject<T>>;
    update(id: string, attributes: DataViewAttributes, options: {}): Promise<SavedObject<unknown>>;
    create(attributes: DataViewAttributes, options: DataViewCrudTypes['CreateOptions']): Promise<SavedObject<DataViewAttributes>>;
    delete(id: string): Promise<void>;
}
