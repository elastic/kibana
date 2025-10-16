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

import {
  WorkspaceSidebarButtonsComponent,
  type WorkspaceSidebarButtonsComponentProps,
} from './workspace_sidebar_buttons.component';

export type WorkspaceSidebarButtonsProps = WorkspaceSidebarButtonsComponentProps;

export const WorkspaceSidebarButtons = ({ apps }: WorkspaceSidebarButtonsProps) => {
  const { euiTheme } = useEuiTheme();

  const root = css`
    margin-right: ${euiTheme.size.s};
    position: relative;
  `;

  return <WorkspaceSidebarButtonsComponent apps={apps} css={root} />;
};
