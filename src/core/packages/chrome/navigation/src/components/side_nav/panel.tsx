/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiPanel, useEuiOverflowScroll, useEuiTheme } from '@elastic/eui';
import React, { ReactNode } from 'react';
import { css } from '@emotion/react';

export interface SideNavPanelProps {
  children: ReactNode;
}

/**
 * Side navigation panel that opens on mouse click if the page contains sub-pages.
 *
 * `paddingSize="m"` is already `16px`, so we have to manually set `12px` padding
 */
export const SideNavPanel = ({ children }: SideNavPanelProps): JSX.Element => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiPanel
      className="side_panel"
      css={css`
        ${useEuiOverflowScroll('y')}
        border-right: 1px ${euiTheme.colors.borderBaseSubdued} solid;
        height: 100%;
      `}
      color="subdued"
      // > For instance, only plain or transparent panels can have a border and/or shadow.
      // source: https://eui.elastic.co/docs/components/containers/panel/
      // hasBorder
      paddingSize="none"
      borderRadius="none"
      grow={false}
    >
      {children}
    </EuiPanel>
  );
};
