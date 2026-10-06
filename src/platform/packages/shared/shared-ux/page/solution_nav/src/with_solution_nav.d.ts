/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ComponentType, CSSProperties, ReactNode } from 'react';
import type React from 'react';
import type { EuiPageSidebarProps } from '@elastic/eui';
import type { SolutionNavProps } from './solution_nav';
export interface TemplateProps {
  children?: ReactNode;
  pageSideBar?: ReactNode;
  pageSideBarProps?: EuiPageSidebarProps;
  style?: CSSProperties;
}
type Props<P> = P &
  TemplateProps & {
    solutionNav: SolutionNavProps;
  };
export declare const withSolutionNav: <P extends TemplateProps>(
  WrappedComponent: ComponentType<P>
) => {
  (props: Props<P>): React.JSX.Element;
  displayName: string;
};
export {};
