import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
export interface DetailViewData {
    name: string;
    label: string;
    component: any;
}
export interface InspectorKibanaServices {
    share: SharePluginStart;
    application: CoreStart['application'];
    http: CoreStart['http'];
    uiSettings: CoreStart['uiSettings'];
    settings: CoreStart['settings'];
    theme: CoreStart['theme'];
}
