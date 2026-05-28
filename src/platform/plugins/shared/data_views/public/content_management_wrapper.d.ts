import type { ContentClient } from '@kbn/content-management-plugin/public';
import type { DataViewAttributes, SavedObject, PersistenceAPI, SavedObjectsClientCommonFindArgs } from '../common/types';
import type { DataViewCrudTypes } from '../common/content_management';
export declare class ContentMagementWrapper implements PersistenceAPI {
    private contentManagementClient;
    constructor(contentManagementClient: ContentClient);
    find(options: SavedObjectsClientCommonFindArgs): Promise<import("@kbn/content-management-utils").SOWithMetadata<DataViewAttributes>[]>;
    get(id: string): Promise<import("@kbn/content-management-utils").SOWithMetadata<DataViewAttributes>>;
    update(id: string, attributes: DataViewAttributes, options: DataViewCrudTypes['UpdateOptions']): Promise<SavedObject<DataViewAttributes>>;
    create(attributes: DataViewAttributes, options: DataViewCrudTypes['CreateOptions']): Promise<import("@kbn/content-management-utils").SOWithMetadata<DataViewAttributes>>;
    delete(id: string): Promise<void>;
}
