/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { FC } from 'react';
import { EuiButtonIcon, EuiTitle, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

import { useMenuHeaderStyle } from '../../hooks/use_menu_header_style';
import { useNestedMenu } from './use_nested_menu';

export interface HeaderProps {
  title?: string;
  'aria-describedby'?: string;
}

export const Header: FC<HeaderProps> = ({ title, 'aria-describedby': ariaDescribedBy }) => {
  const { goBack } = useNestedMenu();
  const { euiTheme } = useEuiTheme();
  const headerStyle = useMenuHeaderStyle();

  const titleStyle = css`
    align-items: center;
    background: ${euiTheme.colors.backgroundBasePlain};
    border-radius: ${euiTheme.border.radius.medium};
    display: flex;
    gap: ${euiTheme.size.s};
    ${headerStyle}
  `;

  return (
    <div css={titleStyle}>
      <EuiButtonIcon
        aria-describedby={ariaDescribedBy}
        aria-label={i18n.translate('core.ui.chrome.sideNavigation.goBackButtonIconAriaLabel', {
          defaultMessage: 'Go back',
        })}
        color="text"
        iconType="arrowLeft"
        onClick={goBack}
      />
      {title && (
        <EuiTitle size="xs">
          <h4>{title}</h4>
        </EuiTitle>
      )}
    </div>
  );
};
