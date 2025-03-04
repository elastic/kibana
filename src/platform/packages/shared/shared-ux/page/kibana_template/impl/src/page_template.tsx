/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { FC, memo, useMemo } from 'react';
import { EuiPageTemplate } from '@elastic/eui';

import {
  NoDataConfigPage,
  NoDataConfigPageProps,
  NoDataConfigPageWithSolutionNavBar,
} from '@kbn/shared-ux-page-no-data-config';
import { KibanaPageTemplateProps } from '@kbn/shared-ux-page-kibana-template-types';

import { KibanaPageTemplateInner, KibanaPageTemplateWithSolutionNav } from './page_template_inner';

type ComponentType =
  | typeof NoDataConfigPageWithSolutionNavBar
  | typeof NoDataConfigPage
  | typeof KibanaPageTemplateWithSolutionNav
  | typeof KibanaPageTemplateInner;

type TemplateComponentProps = KibanaPageTemplateProps | NoDataConfigPageProps;

type ComponentProps = Omit<TemplateComponentProps, 'solutionNav' | 'ref'> & {
  solutionNav: { name: string };
};

export const _KibanaPageTemplate: FC<KibanaPageTemplateProps> = memo(
  ({ className, children, solutionNav, noDataConfig, ...rest }) => {
    /**
     * If passing the custom template of `noDataConfig`
     */
    const Component: ComponentType = useMemo(() => {
      if (noDataConfig && solutionNav) {
        return NoDataConfigPageWithSolutionNavBar;
      }

      if (noDataConfig) {
        return NoDataConfigPage;
      }

      if (solutionNav) {
        return KibanaPageTemplateWithSolutionNav;
      }

      return KibanaPageTemplateInner;
    }, [noDataConfig, solutionNav]);

    const componentProps: ComponentProps = useMemo(() => {
      return {
        'data-test-subj': rest['data-test-subj'],
        className,
        noDataConfig,
        solutionNav: solutionNav ? solutionNav : { name: 'Observability' },
        children,
        ...rest,
      };
    }, [rest, className, noDataConfig, solutionNav, children]);
    return <Component {...componentProps} />;
  }
);

/**
 * Kibana-specific wrapper of EuiPageTemplate and it's namespaced components
 */
export const KibanaPageTemplate = Object.assign(_KibanaPageTemplate, {
  Sidebar: EuiPageTemplate.Sidebar,
  Header: EuiPageTemplate.Header,
  Section: EuiPageTemplate.Section,
  BottomBar: EuiPageTemplate.BottomBar,
  EmptyPrompt: EuiPageTemplate.EmptyPrompt,
});
