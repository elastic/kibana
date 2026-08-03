import type { NotificationsStart } from '@kbn/core/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { DataView, UsageCollectionStart } from '../shared_imports';
import { DataViewLazy } from '../shared_imports';
export declare function removeFields(fieldNames: string[], dataView: DataView | DataViewLazy, services: {
    dataViews: DataViewsPublicPluginStart;
    usageCollection: UsageCollectionStart;
    notifications: NotificationsStart;
}): Promise<void>;
