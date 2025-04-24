/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiHeader, EuiHeaderSection, EuiButtonIcon, EuiAvatar } from '@elastic/eui';
import type { ChromeBreadcrumb } from '@kbn/core-chrome-browser';

import { KibanaWorkspaceBreadcrumbs } from './workspace_breadcrumbs';
import { KibanaWorkspaceHeaderLogo } from './workspace_header_logo';

import { styles } from './workspace_header.styles';

export interface KibanaWorkspaceHeaderComponentProps {
  isNavigationCollapsed: boolean;
  onNavigationToggle: () => void;
  logo?: JSX.Element;
  breadcrumbs: ChromeBreadcrumb[];
  children?: React.ReactNode;
}

export const KibanaWorkspaceHeaderComponent = ({
  isNavigationCollapsed,
  onNavigationToggle,
  breadcrumbs,
  children,
  logo = <KibanaWorkspaceHeaderLogo />,
}: KibanaWorkspaceHeaderComponentProps) => {
  return (
    <EuiHeader css={styles.root}>
      <EuiHeaderSection side="left" grow={false}>
        <EuiButtonIcon
          iconType={isNavigationCollapsed ? 'menuRight' : 'menuLeft'}
          onClick={onNavigationToggle}
          aria-label="Toggle navigation"
          size="s"
          color="text"
        />
      </EuiHeaderSection>
      <EuiHeaderSection side="left" css={styles.section}>
        {logo}
      </EuiHeaderSection>
      <EuiHeaderSection side="left" css={styles.section}>
        <EuiAvatar size="s" type="space" name="Kibana" />
      </EuiHeaderSection>
      <EuiHeaderSection side="left" css={styles.section}>
        <KibanaWorkspaceBreadcrumbs {...{ breadcrumbs }} />
      </EuiHeaderSection>
      <EuiHeaderSection side="right">{children}</EuiHeaderSection>
    </EuiHeader>
  );
};
