import React from 'react';
import type { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import type { DashboardRedirect } from '../types';
export interface DashboardListingPageProps {
    kbnUrlStateStorage: IKbnUrlStateStorage;
    redirectTo: DashboardRedirect;
    initialFilter?: string;
    title?: string;
}
export declare const DashboardListingPage: ({ title, redirectTo, initialFilter, kbnUrlStateStorage, }: DashboardListingPageProps) => React.JSX.Element | null;
