/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiButtonIcon, EuiTitle, useEuiTheme } from '@elastic/eui';
import React, { FC } from 'react';
import { css } from '@emotion/react';

import { useNestedMenu } from '../../hooks/use_nested_menu';

export interface BackButtonProps {
  title?: string;
}

export const BackButton: FC<BackButtonProps> = ({ title }) => {
  const { goBack } = useNestedMenu();
  const { euiTheme } = useEuiTheme();

  const titleStyle = css`
    align-items: center;
    background: ${euiTheme.colors.backgroundBasePlain};
    border-radius: ${euiTheme.border.radius.medium};
    display: flex;
    gap: ${euiTheme.size.s};
    padding: ${euiTheme.size.base} ${euiTheme.size.m};
    padding-bottom: ${euiTheme.size.xs};
    position: sticky;
    top: 0;
    z-index: 1;
  `;

  return (
    <div css={titleStyle}>
      {/* TODO: translate */}
      <EuiButtonIcon aria-label="Go back" color="text" iconType="arrowLeft" onClick={goBack} />
      {title && (
        <EuiTitle size="xs">
          <h4>{title}</h4>
        </EuiTitle>
      )}
    </div>
  );
};
