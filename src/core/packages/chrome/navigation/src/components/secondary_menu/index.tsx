/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiTitle, useEuiTheme } from '@elastic/eui';
import type { ForwardRefExoticComponent, ReactNode, RefAttributes } from 'react';
import React, { forwardRef } from 'react';
import { css } from '@emotion/react';

import { SecondaryMenuItemComponent } from './item';
import { SecondaryMenuSectionComponent } from './section';
import { useMenuHeaderStyle } from '../../hooks/use_menu_header_style';
import { BetaBadge } from '../beta_badge';
import type { BadgeType } from '../../../types';

export interface SecondaryMenuProps {
  badgeType?: BadgeType;
  children: ReactNode;
  isPanel?: boolean;
  title: string;
}

interface SecondaryMenuComponent
  extends ForwardRefExoticComponent<SecondaryMenuProps & RefAttributes<HTMLDivElement>> {
  Item: typeof SecondaryMenuItemComponent;
  Section: typeof SecondaryMenuSectionComponent;
}

/**
 * This menu is reused between the side nav panel and the side nav popover.
 */
const SecondaryMenuBase = forwardRef<HTMLDivElement, SecondaryMenuProps>(
  ({ badgeType, children, isPanel = false, title }, ref) => {
    const { euiTheme } = useEuiTheme();
    const headerStyle = useMenuHeaderStyle();

    const titleWithBadgeStyles = css`
      display: flex;
      align-items: center;
      gap: ${euiTheme.size.xs};
    `;

    return (
      <div ref={ref}>
        <EuiTitle
          css={css`
            ${headerStyle}
            background: ${isPanel
              ? euiTheme.colors.backgroundBaseSubdued
              : euiTheme.colors.backgroundBasePlain};
            border-radius: ${euiTheme.border.radius.medium};
          `}
          size="xs"
        >
          <div css={titleWithBadgeStyles}>
            <h4>{title}</h4>
            {badgeType && <BetaBadge type={badgeType} alignment="text-bottom" />}
          </div>
        </EuiTitle>
        {children}
      </div>
    );
  }
);

export const SecondaryMenu = Object.assign(SecondaryMenuBase, {
  Item: SecondaryMenuItemComponent,
  Section: SecondaryMenuSectionComponent,
}) satisfies SecondaryMenuComponent;
