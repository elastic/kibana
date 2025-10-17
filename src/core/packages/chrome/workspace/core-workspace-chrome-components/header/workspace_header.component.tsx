/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiHeader, EuiHeaderSection, EuiHeaderSectionItem } from '@elastic/eui';
import type { ChromeBreadcrumb, ChromeNavControl } from '@kbn/core-chrome-browser';
import { HeaderExtension } from '@kbn/core-chrome-browser-internal/src/ui/header/header_extension';

import { WorkspaceBreadcrumbs } from './workspace_breadcrumbs';
import { WorkspaceHeaderLogo } from './workspace_header_logo';

import { styles } from './workspace_header.styles';

export interface WorkspaceHeaderComponentProps {
  headerLogo?: JSX.Element;
  breadcrumbs?: ChromeBreadcrumb[];
  children?: React.ReactNode;
  navControls?: {
    left: ChromeNavControl[];
    right: ChromeNavControl[];
    middle: ChromeNavControl[];
  };
}

export const WorkspaceHeaderComponent = ({
  breadcrumbs = [],
  children,
  headerLogo = <WorkspaceHeaderLogo />,
  navControls = { left: [], right: [], middle: [] },
}: WorkspaceHeaderComponentProps) => {
  return (
    <EuiHeader css={styles.root}>
      <EuiHeaderSection side="left" css={styles.logoSection}>
        {headerLogo}
      </EuiHeaderSection>
      <EuiHeaderSection side="left" css={styles.spaceSection}>
        {navControls.left.map((navControl) => (
          <EuiHeaderSectionItem key={navControl.order}>
            <HeaderExtension extension={navControl.mount} />
          </EuiHeaderSectionItem>
        ))}
      </EuiHeaderSection>
      <EuiHeaderSection side="left" css={styles.breadcrumbsSection}>
        <WorkspaceBreadcrumbs {...{ breadcrumbs }} />
      </EuiHeaderSection>
      <EuiHeaderSection side="right" css={styles.rightSection}>
        {navControls.middle.map((navControl) => (
          <EuiHeaderSectionItem key={navControl.order}>
            <HeaderExtension extension={navControl.mount} />
          </EuiHeaderSectionItem>
        ))}
        {children}
        {navControls.right.map((navControl) => (
          <EuiHeaderSectionItem key={navControl.order}>
            <HeaderExtension extension={navControl.mount} />
          </EuiHeaderSectionItem>
        ))}
      </EuiHeaderSection>
    </EuiHeader>
  );
};
