/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import './page_template.scss';

import React, { FunctionComponent } from 'react';

import { NoDataConfigPage, NoDataConfigPageWithSolutionNavBar } from './no_data_page';
import { KibanaPageTemplateInner, KibanaPageTemplateWithSolutionNav } from './page_template_inner';
import { KibanaPageTemplateProps } from './types';

export const KibanaPageTemplate: FunctionComponent<KibanaPageTemplateProps> = ({
  template,
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
        template={template}
        className={className}
        solutionNav={solutionNav}
        children={children}
        {...rest}
      />
    );
  }

  return (
    <KibanaPageTemplateInner
      template={template}
      className={className}
      children={children}
      {...rest}
    />
  );
};
