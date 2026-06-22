/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiIcon, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

import type { SecondaryMenuSectionEmptyState } from '../../../types';
import { NAVIGATION_SELECTOR_PREFIX } from '../../constants';

export const SecondaryMenuSectionEmptyStateComponent = ({
  iconType,
  message,
}: SecondaryMenuSectionEmptyState): JSX.Element => {
  const { euiTheme } = useEuiTheme();

  const wrapperStyles = css`
    align-items: center;
    background-color: ${euiTheme.colors.backgroundBaseHighlighted};
    border-radius: 4px;
    display: flex;
    flex-direction: column;
    gap: ${euiTheme.size.s};
    padding: ${euiTheme.size.l};
    text-align: center;
    width: 100%;
  `;

  const iconStyles = css`
    color: ${euiTheme.colors.textDisabled};

    svg {
      height: 16px;
      width: 16px;
    }
  `;

  const textStyles = css`
    color: ${euiTheme.colors.textDisabled};

    p {
      color: inherit;
      margin: 0;
    }
  `;

  return (
    <div
      css={wrapperStyles}
      data-test-subj={`${NAVIGATION_SELECTOR_PREFIX}-sectionEmptyState`}
      role="status"
    >
      <EuiIcon css={iconStyles} size="m" type={iconType} />
      <EuiText css={textStyles} size="xs">
        <p>{message}</p>
      </EuiText>
    </div>
  );
};
