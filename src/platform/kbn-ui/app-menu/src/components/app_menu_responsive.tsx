/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiHeaderLinks, type EuiBreakpointSize, useCurrentEuiBreakpoint } from '@elastic/eui';
import { useCurrentChromeApplicationBreakpoint } from '@kbn/ui-chrome-layout';
import { APP_MENU_TEST_SUBJECTS } from '../test_subjects';

export type AppMenuBreakpointSource = 'application' | 'viewport';

export type AppMenuLayout = 'collapsed' | 'minimal' | 'expanded';

export const APPLICATION_LAYOUTS: Record<EuiBreakpointSize, AppMenuLayout> = {
  xs: 'collapsed',
  s: 'minimal',
  m: 'expanded',
  l: 'expanded',
  xl: 'expanded',
};

export const VIEWPORT_LAYOUTS: Record<EuiBreakpointSize, AppMenuLayout> = {
  xs: 'collapsed',
  s: 'collapsed',
  m: 'minimal',
  l: 'minimal',
  xl: 'expanded',
};

export const AppMenuHeaderLinks = ({ children }: { children: React.ReactNode }) => (
  <EuiHeaderLinks
    data-test-subj={APP_MENU_TEST_SUBJECTS.root}
    gutterSize="xs"
    popoverBreakpoints="none"
    className="kbnTopNavMenu__wrapper"
  >
    {children}
  </EuiHeaderLinks>
);

export interface AppMenuResponsiveContentProps {
  content: Record<AppMenuLayout, React.ReactNode>;
}

type AppMenuResolvedResponsiveContentProps = AppMenuResponsiveContentProps & {
  breakpoint: EuiBreakpointSize | undefined;
  source: AppMenuBreakpointSource;
};

export const AppMenuResponsiveContent = ({
  content,
  breakpoint,
  source,
}: AppMenuResolvedResponsiveContentProps) => {
  const layouts = source === 'application' ? APPLICATION_LAYOUTS : VIEWPORT_LAYOUTS;
  const layout = breakpoint ? layouts[breakpoint] : 'collapsed';

  return <AppMenuHeaderLinks>{content[layout]}</AppMenuHeaderLinks>;
};

export const AppMenuApplicationResponsiveContent = (props: AppMenuResponsiveContentProps) => {
  const applicationBreakpoint = useCurrentChromeApplicationBreakpoint();
  const viewportBreakpoint = useCurrentEuiBreakpoint();

  return (
    <AppMenuResponsiveContent
      {...props}
      breakpoint={applicationBreakpoint ?? viewportBreakpoint}
      source={applicationBreakpoint === undefined ? 'viewport' : 'application'}
    />
  );
};

export const AppMenuViewportResponsiveContent = (props: AppMenuResponsiveContentProps) => {
  const breakpoint = useCurrentEuiBreakpoint();

  return <AppMenuResponsiveContent {...props} breakpoint={breakpoint} source="viewport" />;
};
