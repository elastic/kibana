/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FC } from 'react';
import React from 'react';
import { EuiPageTemplate } from '@elastic/eui';
import type { EuiPageHeaderProps } from '@elastic/eui';

import {
  NoDataConfigPage,
  NoDataConfigPageWithSolutionNavBar,
} from '@kbn/shared-ux-page-no-data-config';
import type { KibanaPageTemplateProps } from '@kbn/shared-ux-page-kibana-template-types';

import { KibanaPageTemplateInner, KibanaPageTemplateWithSolutionNav } from './page_template_inner';
import {
  isTabsOnlyHeader,
  tabsOnlyHeaderCss,
  TABS_ONLY_HEADER_DEFAULTS,
} from './tabs_only_header';

export const _KibanaPageTemplate: FC<KibanaPageTemplateProps> = ({
  className,
  children,
  solutionNav,
  noDataConfig,
  ...rest
}) => {
  /**
   * If passing the custom template of `noDataConfig`
   */
  if (noDataConfig && solutionNav) {
    return (
      <NoDataConfigPageWithSolutionNavBar
        data-test-subj={rest['data-test-subj']}
        className={className}
        noDataConfig={noDataConfig}
        solutionNav={solutionNav}
      />
    );
  }

  if (noDataConfig) {
    return (
      <NoDataConfigPage
        data-test-subj={rest['data-test-subj']}
        className={className}
        noDataConfig={noDataConfig}
      />
    );
  }

  if (solutionNav) {
    return (
      <KibanaPageTemplateWithSolutionNav
        className={className}
        solutionNav={solutionNav}
        children={children}
        {...rest}
      />
    );
  }

  return <KibanaPageTemplateInner className={className} children={children} {...rest} />;
};

/**
 * Wrapper around EuiPageTemplate.Header that applies tabs-only header styling
 * when only tabs are passed (no pageTitle, description, rightSideItems, or children).
 * Ensures border under tabs, no extra spacer, and horizontal padding.
 */
const KibanaPageTemplateHeader: FC<EuiPageHeaderProps> = (props) => {
  if (isTabsOnlyHeader(props)) {
    const { children: _children, css: propsCss, ...rest } = props;
    const merged = {
      ...rest,
      ...TABS_ONLY_HEADER_DEFAULTS,
      css: [tabsOnlyHeaderCss, propsCss].filter(Boolean),
    };
    return <EuiPageTemplate.Header {...merged} />;
  }
  return <EuiPageTemplate.Header {...props} />;
};

/**
 * Kibana-specific wrapper of EuiPageTemplate and it's namespaced components
 */
export const KibanaPageTemplate = Object.assign(_KibanaPageTemplate, {
  Sidebar: EuiPageTemplate.Sidebar,
  Header: KibanaPageTemplateHeader,
  Section: EuiPageTemplate.Section,
  BottomBar: EuiPageTemplate.BottomBar,
  EmptyPrompt: EuiPageTemplate.EmptyPrompt,
});
