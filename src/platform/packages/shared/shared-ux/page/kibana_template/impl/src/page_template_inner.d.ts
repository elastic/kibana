/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FC } from 'react';
import type React from 'react';
import type { KibanaPageTemplateProps as Props } from '@kbn/shared-ux-page-kibana-template-types';
/**
 * A thin wrapper around EuiPageTemplate with a few Kibana specific additions
 */
export declare const KibanaPageTemplateInner: FC<Props>;
export declare const KibanaPageTemplateWithSolutionNav: {
  (
    props: import('@elastic/eui/src/components/page_template/outer/page_outer')._EuiPageOuterProps &
      Omit<
        import('@elastic/eui/src/components/page_template/inner/page_inner')._EuiPageInnerProps,
        'border' | 'component'
      > &
      import('@elastic/eui/src/components/page/_restrict_width')._EuiPageRestrictWidth &
      import('@elastic/eui/src/components/page/_bottom_border')._EuiPageBottomBorder & {
        contentBorder?: import('@elastic/eui/src/components/page_template/inner/page_inner')._EuiPageInnerProps['border'];
        minHeight?: React.CSSProperties['minHeight'];
        offset?: number;
        mainProps?: import('@elastic/eui').CommonProps & React.HTMLAttributes<HTMLElement>;
        component?: import('@elastic/eui/src/components/page_template/inner/page_inner').ComponentTypes;
      } & {
        isEmptyState?: boolean;
        emptyPageBody?: React.ReactNode;
        solutionNav?: import('@kbn/shared-ux-page-solution-nav').SolutionNavProps;
        noDataConfig?: import('@kbn/shared-ux-page-no-data-config-types').NoDataConfig;
        pageHeader?: import('@elastic/eui').EuiPageHeaderProps;
        pageSideBar?: React.ReactNode;
        pageSideBarProps?: import('@elastic/eui').EuiPageSidebarProps;
      } & import('@kbn/shared-ux-page-solution-nav/src/with_solution_nav').TemplateProps & {
        solutionNav: import('@kbn/shared-ux-page-solution-nav').SolutionNavProps;
      }
  ): React.JSX.Element;
  displayName: string;
};
