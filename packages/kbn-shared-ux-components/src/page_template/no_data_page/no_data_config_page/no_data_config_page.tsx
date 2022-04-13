/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { EuiPageTemplate } from '@elastic/eui';
import React from 'react';
import { NoDataPage } from '../no_data_page';
import { withSolutionNav } from '../../with_solution_nav';
import { KibanaPageTemplateProps } from '../../types';
import { getClasses, NO_DATA_PAGE_TEMPLATE_PROPS } from '../../util';

export const NoDataConfigPage = (props: KibanaPageTemplateProps) => {
  const { className, noDataConfig, ...rest } = props;

  if (!noDataConfig) {
    return null;
  }

  const template = NO_DATA_PAGE_TEMPLATE_PROPS.template;
  const classes = getClasses(template, className);

  return (
    <EuiPageTemplate
      data-test-subj={props['data-test-subj']}
      template={template}
      className={classes}
      {...rest}
      {...NO_DATA_PAGE_TEMPLATE_PROPS}
    >
      <NoDataPage {...noDataConfig} />
    </EuiPageTemplate>
  );
};

export const NoDataConfigPageWithSolutionNavBar = withSolutionNav(NoDataConfigPage);
