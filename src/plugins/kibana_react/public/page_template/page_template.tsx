/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import './page_template.scss';

import React, { FunctionComponent } from 'react';
import { EuiPageTemplateProps } from '@elastic/eui';
import { KibanaPageTemplateSolutionNavProps } from './solution_nav';

import {
  NoDataPageProps,
  NoDataConfigPage,
  NoDataConfigPageWithSolutionNavBar,
} from './no_data_page';
import { KibanaPageTemplateInner, KibanaPageTemplateWithSolutionNav } from './page_template_inner';

/**
 * A thin wrapper around EuiPageTemplate with a few Kibana specific additions
 * @deprecated Use `KibanaPageTemplateProps` from `kbn-shared-ux-components`.
 */
export type KibanaPageTemplateProps = EuiPageTemplateProps & {
  /**
   * Changes the template type depending on other props provided.
   * With `pageHeader` only: Uses `centeredBody` and fills an EuiEmptyPrompt with `pageHeader` info.
   * With `children` only: Uses `centeredBody`
   * With `pageHeader` and `children`: Uses `centeredContent`
   */
  isEmptyState?: boolean;
  /**
   * Quick creation of EuiSideNav. Hooks up mobile instance too
   */
  solutionNav?: KibanaPageTemplateSolutionNavProps;
  /**
   * Accepts a configuration object, that when provided, ignores pageHeader and children and instead
   * displays Agent, Beats, and custom cards to direct users to the right ingest location
   */
  noDataConfig?: NoDataPageProps;
};

/** @deprecated Use `KibanaPageTemplate` from `kbn-shared-ux-components`. */
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
