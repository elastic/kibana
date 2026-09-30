/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { forwardRef } from 'react';
import type { ForwardRefExoticComponent, ReactNode, RefAttributes } from 'react';
import { EuiTitle, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

import type { BadgeType } from '../../../types';
import { BetaBadge } from '../beta_badge';
import { SecondaryMenuItemComponent } from './item';
import { SecondaryMenuSectionComponent } from './section';
import {
  useMenuHeaderStyle,
  type SecondaryHeaderSpacing,
} from '../../hooks/use_menu_header_style';
import { useSecondaryHeaderSpacing } from '../../hooks/use_secondary_header_spacing';
import { scrollLayoutStyles, useScroll } from '../../hooks/use_scroll';

export interface SecondaryMenuProps {
  badgeType?: BadgeType;
  children: ReactNode;
  footer?: ReactNode;
  isNew?: boolean;
  isPanel?: boolean;
  /**
   * Header spacing. Defaults to Navigation's `secondaryHeaderSpacing`, or `standard`.
   */
  spacing?: SecondaryHeaderSpacing;
  title: string;
}

interface SecondaryMenuComponent
  extends ForwardRefExoticComponent<SecondaryMenuProps & RefAttributes<HTMLDivElement>> {
  Item: typeof SecondaryMenuItemComponent;
  Section: typeof SecondaryMenuSectionComponent;
}

const SecondaryMenuBase = forwardRef<HTMLDivElement, SecondaryMenuProps>(
  ({ badgeType, children, footer, title, isNew = false, spacing: spacingProp }, ref) => {
    const { euiTheme } = useEuiTheme();
    const spacing = useSecondaryHeaderSpacing(spacingProp);
    const headerStyle = useMenuHeaderStyle(spacing);
    const scrollStyles = useScroll(true);

    const titleWithBadgeStyles = css`
      display: flex;
      align-items: center;
      gap: ${euiTheme.size.xs};
    `;

    return (
      <div ref={ref} css={scrollLayoutStyles}>
        <EuiTitle css={headerStyle} size="xs">
          <div css={titleWithBadgeStyles}>
            <h4>{title}</h4>
            {/* Always show non-new badges, only show new ones if isNew check allows it */}
            {badgeType && (badgeType !== 'new' || isNew) && (
              <BetaBadge type={badgeType} alignment="text-bottom" />
            )}
          </div>
        </EuiTitle>
        <div css={scrollStyles}>{children}</div>
        {footer}
      </div>
    );
  }
);

/**
 * This menu is reused between the side nav panel and the side nav popover.
 */
export const SecondaryMenu = Object.assign(SecondaryMenuBase, {
  Item: SecondaryMenuItemComponent,
  Section: SecondaryMenuSectionComponent,
}) satisfies SecondaryMenuComponent;
