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

  const rowStyles = css`
    ${headerStyle}
    align-items: center;
    background: ${euiTheme.colors.backgroundBasePlain};
    border-radius: 0;
    box-sizing: border-box;
    display: flex;
    gap: ${euiTheme.size.s};
    height: fit-content;
    min-height: 0;
    padding: ${euiTheme.size.base} 20px 0 20px;
    text-align: start;
  `;

  const titleStyles = css`
    flex: 1;
    min-width: 0;
    margin-block: 0;
  `;

  return (
    <div css={rowStyles}>
      <EuiButtonIcon
        aria-describedby={ariaDescribedBy}
        aria-label={i18n.translate('core.ui.chrome.sideNavigation.goBackButtonIconAriaLabel', {
          defaultMessage: 'Go back',
        })}
        color="text"
        iconType="chevronSingleLeft"
        onClick={goBack}
      />
      {title && (
        <EuiTitle css={titleStyles} size="xs">
          <h4>{title}</h4>
        </EuiTitle>
      )}
    </div>
  );
};
