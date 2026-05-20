import type { ActionsPublicPluginSetup } from '@kbn/actions-plugin/public';
export type { ClientConfigType } from './types';
export { Job } from './job';
export * from './job_completion_notifications';
export { InternalApiClientProvider, useInternalApiClient } from './context';
export { useCheckIlmPolicyStatus } from './hooks';
export { ReportingAPIClient } from './reporting_api_client';
export { checkLicense } from './license_check';
import type { CoreSetup, CoreStart, NotificationsStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
export interface KibanaContext {
    http: CoreSetup['http'];
    application: CoreStart['application'];
    settings: CoreStart['settings'];
    uiSettings: CoreStart['uiSettings'];
    docLinks: CoreStart['docLinks'];
    data: DataPublicPluginStart;
    share: SharePluginStart;
    actions: ActionsPublicPluginSetup;
    notifications: NotificationsStart;
    license$: LicensingPluginStart['license$'];
    userProfile: CoreStart['userProfile'];
}
export declare const useKibana: () => import("@kbn/kibana-react-plugin/public").KibanaReactContextValue<Partial<CoreStart> & KibanaContext>;
