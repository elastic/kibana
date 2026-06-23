/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiButton, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

import type { PanelFooterAction } from '../../../types';

export interface SecondaryMenuPanelFooterProps {
  actions: PanelFooterAction[];
  onActionClick?: (action: PanelFooterAction) => void;
}

export const SecondaryMenuPanelFooter = ({
  actions,
  onActionClick,
}: SecondaryMenuPanelFooterProps): JSX.Element | null => {
  const { euiTheme } = useEuiTheme();

  if (!actions.length) {
    return null;
  }

  const footerStyles = css`
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    padding: ${euiTheme.size.s} ${euiTheme.size.m} ${euiTheme.size.m};
    width: 100%;
  `;

  return (
    <div css={footerStyles}>
      {actions.map((action) => (
        <EuiButton
          key={action.id}
          data-test-subj={action['data-test-subj']}
          fullWidth
          href={action.href}
          iconType={action.iconType}
          onClick={() => onActionClick?.(action)}
          size="s"
          color="text"
        >
          {action.label}
        </EuiButton>
      ))}
    </div>
  );
};
