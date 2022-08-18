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

import { NO_DATA_PAGE_TEMPLATE_PROPS } from './constants';

const getClasses = (template?: string, className?: string) => {
  return classNames(
    'kbnPageTemplate',
    template ? { [`kbnPageTemplate--${template}`]: template } : '',
    className || ''
  );
};

export const NoDataConfigPage = (props: NoDataConfigPageProps) => {
  const { className: classNameProp, noDataConfig, ...rest } = props;

  if (!noDataConfig) {
    return null;
  }

  const className = getClasses(NO_DATA_PAGE_TEMPLATE_PROPS.template, classNameProp);

  return (
    <EuiPageTemplate
      data-test-subj={props['data-test-subj']}
      {...{ className, ...rest }}
      {...NO_DATA_PAGE_TEMPLATE_PROPS}
    >
      <NoDataPage {...noDataConfig} />
    </EuiPageTemplate>
  );
};

export const NoDataConfigPageWithSolutionNavBar = withSolutionNav(NoDataConfigPage);
