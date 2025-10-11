/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { css } from '@emotion/react';

import { useEuiTheme } from '@elastic/eui';

import { useIsSidebarOpen } from '@kbn/core-workspace-chrome-state';

import {
  WorkspaceSidebarButtonsComponent,
  type WorkspaceSidebarButtonsComponentProps,
} from './workspace_sidebar_buttons.component';

export type WorkspaceSidebarButtonsProps = WorkspaceSidebarButtonsComponentProps;

export const WorkspaceSidebarButtons = ({ apps }: WorkspaceSidebarButtonsProps) => {
  const { euiTheme } = useEuiTheme();
  const isSidebarOpen = useIsSidebarOpen();

  const separator = css`
    &::after {
      content: '';
      display: block;
      width: ${euiTheme.border.width.thin};
      background-color: ${euiTheme.colors.borderBaseSubdued};
      position: absolute;
      right: -${euiTheme.size.m};
      top: ${euiTheme.size.xs};
      bottom: ${euiTheme.size.xs};
    }
  `;

  const root = css`
    margin-right: ${euiTheme.size.s};
    position: relative;
    ${isSidebarOpen ? separator : ''}
  `;

  return <WorkspaceSidebarButtonsComponent apps={apps} css={root} />;
};
