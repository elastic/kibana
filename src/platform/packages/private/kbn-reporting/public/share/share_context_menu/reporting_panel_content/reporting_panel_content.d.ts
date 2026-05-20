import type { ReactElement } from 'react';
import React from 'react';
import * as Rx from 'rxjs';
import type { WithEuiThemeProps } from '@elastic/eui';
import type { InjectedIntl } from '@kbn/i18n-react';
import type { BaseParams } from '@kbn/reporting-common/types';
import type { StartServices } from '../..';
import type { ReportingAPIClient } from '../../../reporting_api_client';
/**
 * Properties for displaying a share menu with Reporting features, including
 * internally-derived fields.
 */
export interface ReportingPanelProps {
    apiClient: ReportingAPIClient;
    reportType: string;
    requiresSavedState: boolean;
    layoutId?: string;
    objectId?: string;
    getJobParams: (forShareUrl?: boolean) => Omit<BaseParams, 'browserTimezone' | 'version'>;
    options?: ReactElement | null;
    isDirty?: boolean;
    onClose?: () => void;
    startServices$: Rx.Observable<StartServices>;
    theme: WithEuiThemeProps['theme'];
}
export type Props = ReportingPanelProps & {
    intl: InjectedIntl;
};
export declare const ReportingPanelContent: React.FC<import("react-intl").WithIntlProps<Omit<ReportingPanelProps & {
    intl: InjectedIntl;
}, "theme"> & React.RefAttributes<Omit<ReportingPanelProps & {
    intl: InjectedIntl;
}, "theme">>>> & {
    WrappedComponent: React.ComponentType<Omit<ReportingPanelProps & {
        intl: InjectedIntl;
    }, "theme"> & React.RefAttributes<Omit<ReportingPanelProps & {
        intl: InjectedIntl;
    }, "theme">>>;
};
