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
import type { IconType } from '@elastic/eui';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { useMenuHeaderStyle } from '../../hooks/use_menu_header_style';
import { useNestedMenu } from './use_nested_menu';

export interface HeaderProps {
  title?: string;
  'aria-describedby'?: string;
  /**
   * Primary-nav icon shown beside the header title.
   */
  iconType?: IconType;
}

export const Header: FC<HeaderProps> = ({
  title,
  'aria-describedby': ariaDescribedBy,
  iconType,
}) => {
  const { goBack } = useNestedMenu();
  const headerStyle = useMenuHeaderStyle();

  return (
    <EuiFlexGroup css={headerStyle} alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiToolTip
          content={i18n.translate('kbnUI.sideNavigation.goBackButtonIconAriaLabel', {
            defaultMessage: 'Go back',
          })}
          disableScreenReaderOutput
        >
          <EuiButtonIcon
            aria-describedby={ariaDescribedBy}
            aria-label={i18n.translate('kbnUI.sideNavigation.goBackButtonIconAriaLabel', {
              defaultMessage: 'Go back',
            })}
            color="text"
            iconType="chevronSingleLeft"
            onClick={goBack}
          />
        </EuiToolTip>
      </EuiFlexItem>
      {iconType && (
        <EuiFlexItem grow={false}>
          <EuiIcon type={iconType} size="m" color="subdued" />
        </EuiFlexItem>
      )}
      {title && (
        <EuiFlexItem grow={false}>
          <EuiText size="s" color="subdued">
            <h4>{title}</h4>
          </EuiText>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
