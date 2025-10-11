/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiButtonIcon, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

export interface WorkspaceNavControlComponentProps {
  isNavigationCollapsed: boolean;
  onNavigationToggle: (isNavigationCollapsed: boolean) => void;
}

export const WorkspaceNavControlComponent = ({
  isNavigationCollapsed,
  onNavigationToggle,
}: WorkspaceNavControlComponentProps) => {
  const { euiTheme } = useEuiTheme();
  const style = css`
    align-self: center;
    display: flex;
    justify-content: center;
    position: relative;
    padding-top: ${euiTheme.size.s};
    width: 100%;

    &::before {
      content: '';
      display: block;
      height: 1px;
      width: ${isNavigationCollapsed ? euiTheme.size.l : euiTheme.size.xxxxl};
      background-color: ${euiTheme.colors.borderBaseSubdued};
      position: absolute;
      top: 0;
    }
  `;

  const buttonStyle = css`
    height: ${euiTheme.size.xl};
    width: ${euiTheme.size.xl};
    align-self: center;
  `;

  return (
    <div css={style}>
      <EuiButtonIcon
        css={buttonStyle}
        iconType={isNavigationCollapsed ? 'transitionLeftIn' : 'transitionLeftOut'}
        onClick={() => onNavigationToggle(!isNavigationCollapsed)}
        color="text"
        iconSize="m"
        aria-label={isNavigationCollapsed ? 'Open navigation' : 'Close navigation'}
      />
    </div>
  );
};
