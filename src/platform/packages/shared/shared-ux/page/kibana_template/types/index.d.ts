import type { EuiPageTemplateProps, EuiPageSidebarProps, EuiPageHeaderProps } from '@elastic/eui';
import type { SolutionNavProps } from '@kbn/shared-ux-page-solution-nav';
import type { ReactNode } from 'react';
import type { NoDataConfig, NoDataConfigPageServices, NoDataConfigPageKibanaDependencies } from '@kbn/shared-ux-page-no-data-config-types';
export type KibanaPageTemplateKibanaDependencies = NoDataConfigPageKibanaDependencies;
export type KibanaPageTemplateServices = NoDataConfigPageServices;
export type { NoDataConfig } from '@kbn/shared-ux-page-no-data-config-types';
export type KibanaPageTemplateProps = EuiPageTemplateProps & {
    /**
     * Converts the `pageHeader` contents into an EuiEmptyPrompt when no `children` are present
     */
    isEmptyState?: boolean;
    /**
     * Combined with isEmptyState, this prop allows complete override of the empty page
     */
    emptyPageBody?: ReactNode;
    /**
     * Quick creation of EuiSideNav. Hooks up mobile instance too
     */
    solutionNav?: SolutionNavProps;
    /**
     * Accepts a configuration object, that when provided, ignores `pageHeader` and `children` and instead
     * displays Agent, Beats, and custom cards to direct users to the right ingest location
     */
    noDataConfig?: NoDataConfig;
    /**
     * BWC Props from old EUI template
     */
    pageHeader?: EuiPageHeaderProps;
    pageSideBar?: ReactNode;
    pageSideBarProps?: EuiPageSidebarProps;
};
