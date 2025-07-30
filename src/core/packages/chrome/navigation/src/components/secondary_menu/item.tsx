/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiButton, EuiButtonEmpty, IconType, useEuiTheme } from '@elastic/eui';
import React, { ReactNode } from 'react';
import { css } from '@emotion/react';
import { ISecondaryMenuItem } from '../../../types';

import { useMenuItemClick } from '../../hooks/use_menu_item_click';

export interface SecondaryMenuItemProps extends ISecondaryMenuItem {
  children: ReactNode;
  href: string;
  iconType?: IconType;
  isCurrent: boolean;
  key: string;
  onClick?: () => void;
  testSubjPrefix?: string;
}

/**
 * `EuiButton` and `EuiButtonEmpty` are used for consistency with the component library.
 * The only style overrides are making the button labels left-aligned.
 */
export const SecondaryMenuItem = ({
  children,
  href,
  iconType,
  id,
  isCurrent,
  onClick,
  testSubjPrefix = 'secondaryMenuItem',
  ...props
}: SecondaryMenuItemProps): JSX.Element => {
  const { euiTheme } = useEuiTheme();

  const iconSide = iconType ? 'left' : 'right';

  const iconProps = {
    iconSide: iconSide as 'left' | 'right',
    iconType,
  };

  const styles = css`
    // 6px comes from Figma, no token
    padding: 6px ${euiTheme.size.s};
    width: 100%;

    > span {
      justify-content: ${iconSide === 'left' ? 'flex-start' : 'space-between'};
    }
  `;

  const handleClick = useMenuItemClick(onClick);

  return (
    <li>
      {isCurrent ? (
        // eslint-disable-next-line @elastic/eui/href-or-on-click
        <EuiButton
          css={styles}
          data-test-subj={`${testSubjPrefix}-${id}`}
          fullWidth
          href={href}
          onClick={handleClick}
          size="s"
          tabIndex={0}
          textProps={false}
          {...iconProps}
          {...props}
        >
          {children}
        </EuiButton>
      ) : (
        // eslint-disable-next-line @elastic/eui/href-or-on-click
        <EuiButtonEmpty
          css={styles}
          color="text"
          data-test-subj={`${testSubjPrefix}-${id}`}
          href={href}
          onClick={handleClick}
          size="s"
          tabIndex={0}
          textProps={false}
          {...iconProps}
          {...props}
        >
          {children}
        </EuiButtonEmpty>
      )}
    </li>
  );
};
