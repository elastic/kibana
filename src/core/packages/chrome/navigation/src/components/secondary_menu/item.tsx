/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IconType } from '@elastic/eui';
import { EuiButton, EuiButtonEmpty, useEuiTheme } from '@elastic/eui';
import type { ReactNode } from 'react';
import React from 'react';
import { css } from '@emotion/react';

import type { SecondaryMenuItem } from '../../../types';
import { BetaBadge } from '../beta_badge';

export interface SecondaryMenuItemProps extends SecondaryMenuItem {
  children: ReactNode;
  href: string;
  iconType?: IconType;
  isHighlighted: boolean;
  isCurrent?: boolean;
  key: string;
  onClick?: () => void;
  testSubjPrefix?: string;
}

/**
 * `EuiButton` and `EuiButtonEmpty` are used for consistency with the component library.
 * The only style overrides are making the button labels left-aligned.
 */
export const SecondaryMenuItemComponent = ({
  badgeType,
  children,
  iconType,
  id,
  isHighlighted,
  isCurrent,
  isExternal,
  testSubjPrefix = 'secondaryMenuItem',
  ...props
}: SecondaryMenuItemProps): JSX.Element => {
  const { euiTheme } = useEuiTheme();

  const iconSide = iconType ? 'left' : 'right';
  const iconProps = {
    iconSide: iconSide as 'left' | 'right',
    iconType: isExternal ? 'popout' : iconType,
    // Ensure external links open in a new tab
    ...(isExternal && { target: '_blank' }),
  };

  const styles = css`
    // 6px comes from Figma, no token
    padding: 6px ${euiTheme.size.s};
    width: 100%;

    > span {
      justify-content: ${iconSide === 'left' ? 'flex-start' : 'space-between'};
    }

    svg:not(.euiBetaBadge__icon) {
      color: ${euiTheme.colors.textDisabled};
    }
  `;

  const labelAndBadgeStyles = css`
    align-items: center;
    display: flex;
    gap: ${euiTheme.size.xs};
  `;

  const content = (
    <div css={labelAndBadgeStyles}>
      {children}
      {badgeType && <BetaBadge type={badgeType} />}
    </div>
  );

  return (
    <li>
      {isHighlighted ? (
        <EuiButton
          aria-current={isCurrent ? 'page' : undefined}
          css={styles}
          data-highlighted="true"
          data-test-subj={`${testSubjPrefix}-${id}`}
          fullWidth
          size="s"
          textProps={false}
          {...iconProps}
          {...props}
        >
          {content}
        </EuiButton>
      ) : (
        <EuiButtonEmpty
          aria-current={isCurrent ? 'page' : undefined}
          css={styles}
          color="text"
          data-highlighted="false"
          data-test-subj={`${testSubjPrefix}-${id}`}
          size="s"
          textProps={false}
          {...iconProps}
          {...props}
        >
          {content}
        </EuiButtonEmpty>
      )}
    </li>
  );
};
