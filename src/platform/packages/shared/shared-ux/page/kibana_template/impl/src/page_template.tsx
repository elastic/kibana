/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { FC } from 'react';
import { EuiPageTemplate } from '@elastic/eui';

import {
  NoDataConfigPage,
  NoDataConfigPageWithSolutionNavBar,
} from '@kbn/shared-ux-page-no-data-config';
import { KibanaPageTemplateProps } from '@kbn/shared-ux-page-kibana-template-types';

import { KibanaPageTemplateInner, KibanaPageTemplateWithSolutionNav } from './page_template_inner';

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
 * Kibana-specific wrapper of EuiPageTemplate and it's namespaced components
 */
export const KibanaPageTemplate = Object.assign(_KibanaPageTemplate, {
  Sidebar: EuiPageTemplate.Sidebar,
  Header: EuiPageTemplate.Header,
  Section: EuiPageTemplate.Section,
  BottomBar: EuiPageTemplate.BottomBar,
  EmptyPrompt: EuiPageTemplate.EmptyPrompt,
});
