import type { CoreStart, Plugin } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
export interface SavedObjectsStartDeps {
    data: DataPublicPluginStart;
    dataViews: DataViewsPublicPluginStart;
}
export declare class SavedObjectsPublicPlugin implements Plugin<{}, {}, object, SavedObjectsStartDeps> {
    setup(): {};
    start(core: CoreStart, { data, dataViews }: SavedObjectsStartDeps): {};
}
