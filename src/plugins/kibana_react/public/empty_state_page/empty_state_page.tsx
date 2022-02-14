/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { EuiPageTemplate, useIsWithinBreakpoints } from '@elastic/eui';
import React, { ReactNode } from 'react';
import { useLocalStorage } from 'react-use/lib';
import { KibanaPageTemplateProps, NoDataPage } from '../page_template';
import { KibanaPageTemplateSolutionNav } from '../page_template/solution_nav';
import { getClasses, getPageSideBarProps } from '../page_template/helpers/rendering_helper';

export const NO_DATA_PAGE_MAX_WIDTH = 950;
export const NO_DATA_PAGE_TEMPLATE_PROPS = {
  restrictWidth: NO_DATA_PAGE_MAX_WIDTH,
  template: 'centeredBody',
  pageContentProps: {
    hasShadow: false,
    color: 'transparent',
  },
} as Pick<KibanaPageTemplateProps, 'restrictWidth' | 'template' | 'pageContentProps'>;

type NoDataTemplateProps = Omit<KibanaPageTemplateProps, 'restrictWidth' | 'pageContentProps'>;

export const EmptyStatePage = (props: NoDataTemplateProps) => {
  const { className, pageSideBar, pageSideBarProps, noDataConfig, solutionNav } = props;

  if (!noDataConfig) {
    return null;
  }

  const { template } = NO_DATA_PAGE_TEMPLATE_PROPS;

  const isMediumBreakpoint = useIsWithinBreakpoints(['m']);
  const isLargerBreakpoint = useIsWithinBreakpoints(['l', 'xl']);
  const isSideNavOpenOnDesktop = !useLocalStorage('solutionNavIsCollapsed');
  const shouldApplyShrinkingClass =
    isMediumBreakpoint || (isLargerBreakpoint && !isSideNavOpenOnDesktop);

  const getPageSideBar = (): ReactNode | undefined => {
    if (!solutionNav) {
      return pageSideBar;
    }
    return <KibanaPageTemplateSolutionNav {...solutionNav} />;
  };

  return (
    <EuiPageTemplate
      data-test-subj={props['data-test-subj']}
      className={getClasses(template, className)}
      pageSideBar={getPageSideBar()}
      pageSideBarProps={getPageSideBarProps(
        Boolean(solutionNav),
        shouldApplyShrinkingClass,
        pageSideBarProps
      )}
      {...NO_DATA_PAGE_TEMPLATE_PROPS}
    >
      <NoDataPage {...noDataConfig} />
    </EuiPageTemplate>
  );
};
