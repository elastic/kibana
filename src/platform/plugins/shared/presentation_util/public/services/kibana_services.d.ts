import type { CoreStart } from '@kbn/core/public';
import type { UiActionsPublicStart } from '@kbn/ui-actions-plugin/public/plugin';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { PresentationUtilPluginStartDeps } from '../types';
export declare let coreServices: CoreStart;
export declare let dataViewsService: DataViewsPublicPluginStart;
export declare let uiActionsService: UiActionsPublicStart;
export declare const setKibanaServices: (kibanaCore: CoreStart, deps: PresentationUtilPluginStartDeps) => void;
export declare const untilPluginStartServicesReady: () => Promise<void>;
