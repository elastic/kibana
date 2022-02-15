/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { EuiPageTemplate } from '@elastic/eui';
import React from 'react';
import { KibanaPageTemplateProps, NO_DATA_PAGE_TEMPLATE_PROPS, NoDataPage } from '../page_template';

interface Props {
  classes: string;
}

type EmptyPageProps = Props & KibanaPageTemplateProps;

export const EmptyStatePage = (props: EmptyPageProps) => {
  const { template, classes, pageSideBar, pageSideBarProps, noDataConfig } = props;

  if (!noDataConfig) {
    return null;
  }

  return (
    <EuiPageTemplate
      data-test-subj={props['data-test-subj']}
      template={template}
      className={classes}
      pageSideBar={pageSideBar}
      pageSideBarProps={pageSideBarProps}
      {...NO_DATA_PAGE_TEMPLATE_PROPS}
    >
      <NoDataPage {...noDataConfig} />
    </EuiPageTemplate>
  );
};
