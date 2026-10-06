import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { ICPSManager } from '@kbn/cps-utils';
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
    cpsManager?: ICPSManager;
}
