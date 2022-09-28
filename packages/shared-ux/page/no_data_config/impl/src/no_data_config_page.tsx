/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import classNames from 'classnames';
import { EuiPageTemplate } from '@elastic/eui';

import { withSolutionNav } from '@kbn/shared-ux-page-solution-nav';
import { NoDataPage } from '@kbn/shared-ux-page-no-data';
import type { NoDataConfigPageProps } from '@kbn/shared-ux-page-no-data-config-types';

import { NO_DATA_PAGE_MAX_WIDTH } from './constants';

const getClasses = (template?: string, className?: string) => {
  return classNames(
    'kbnPageTemplate',
    template ? { [`kbnPageTemplate--${template}`]: template } : '',
    className || ''
  );
};

export const NoDataConfigPage = (props: NoDataConfigPageProps) => {
  const { className, noDataConfig, pageSideBar, pageSideBarProps, ...rest } = props;

  if (!noDataConfig) {
    return null;
  }

  let sideBar;
  if (pageSideBar) {
    sideBar = (
      <EuiPageTemplate.Sidebar {...pageSideBarProps}>{pageSideBar}</EuiPageTemplate.Sidebar>
    );
  }

  const classes = getClasses(undefined, className);

  return (
    <EuiPageTemplate
      className={classes}
      restrictWidth={NO_DATA_PAGE_MAX_WIDTH}
      panelled={false}
      // Note: Once all pages have been converted to this new component,
      // the following props can be removed to allow the template to auto-handle
      // the fixed header and banner heights.
      offset={0}
      minHeight={0}
      {...rest}
    >
      {sideBar}
      <NoDataPage {...noDataConfig} />
    </EuiPageTemplate>
  );
};

export const NoDataConfigPageWithSolutionNavBar = withSolutionNav(NoDataConfigPage);
