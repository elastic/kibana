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
import { css } from '@emotion/react';
import type { ChromeBreadcrumb } from '@kbn/core-chrome-browser';
import { EmotionFn } from '../types';
import { WorkspaceBreadcrumbs } from './workspace_breadcrumbs';

import { styles } from './workspace_header.styles';
import { WorkspaceHeaderLogo } from './workspace_header_logo';
export interface WorkspaceHeaderComponentProps {
  isNavigationCollapsed: boolean;
  onNavigationToggle: () => void;
  logo?: JSX.Element;
  breadcrumbs: ChromeBreadcrumb[];
  children?: React.ReactNode;
}

export const WorkspaceHeaderComponent = ({
  isNavigationCollapsed,
  onNavigationToggle,
  breadcrumbs,
  children,
  logo = <WorkspaceHeaderLogo />,
}: WorkspaceHeaderComponentProps) => {
  const euiHeader: EmotionFn = ({ euiTheme }) => css`
    background: none;
    border: none;
    align-items: center;
    box-shadow: none;
    padding: 0 0 0 ${euiTheme.size.s};
  `;

  return (
    <header css={styles.root}>
      <EuiHeader css={euiHeader}>
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
          <WorkspaceBreadcrumbs {...{ breadcrumbs }} />
        </EuiHeaderSection>
        <EuiHeaderSection side="right">{children}</EuiHeaderSection>
      </EuiHeader>
    </header>
  );
};
