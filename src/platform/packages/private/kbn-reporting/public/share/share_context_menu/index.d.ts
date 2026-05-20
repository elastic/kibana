import type * as Rx from 'rxjs';
import type { ApplicationStart, CoreStart } from '@kbn/core/public';
import type { ILicense } from '@kbn/licensing-types';
import type { SharingData } from '@kbn/share-plugin/public';
import type { ReportingAPIClient } from '../../reporting_api_client';
import type { ClientConfigType } from '../../types';
export type StartServices = [
    Pick<CoreStart, 'rendering' | 'notifications'>,
    unknown,
    unknown
];
export interface ExportModalShareOpts {
    apiClient: ReportingAPIClient;
    startServices$: Rx.Observable<StartServices>;
    csvConfig?: ClientConfigType['csv'];
    isServerless?: boolean;
}
export interface ExportPanelShareOpts {
    apiClient: ReportingAPIClient;
    license: ILicense;
    application: ApplicationStart;
    startServices$: Rx.Observable<StartServices>;
}
export interface ReportingSharingData extends SharingData {
    reportingDisabled?: boolean;
}
export interface JobParamsProviderOptions {
    sharingData: ReportingSharingData;
    shareableUrl?: string;
    objectType: string;
    optimizedForPrinting?: boolean;
}
