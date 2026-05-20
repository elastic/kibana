import type { ReactNode } from 'react';
import type { EuiPageTemplateProps, EuiPageSidebarProps } from '@elastic/eui';
import type { NoDataPageProps, NoDataPageServices, NoDataPageKibanaDependencies } from '@kbn/shared-ux-page-no-data-types';
export type NoDataConfigPageKibanaDependencies = NoDataPageKibanaDependencies;
export type NoDataConfigPageServices = NoDataPageServices;
export type NoDataConfig = NoDataPageProps;
export type NoDataConfigPageProps = EuiPageTemplateProps & {
    /**
     * Accepts a configuration object, that when provided, ignores `pageHeader` and `children` and instead
     * displays Agent, Beats, and custom cards to direct users to the right ingest location
     */
    noDataConfig?: NoDataConfig;
    /**
     * BWC Props from old EUI template
     */
    pageSideBar?: ReactNode;
    pageSideBarProps?: EuiPageSidebarProps;
};
