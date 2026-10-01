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
import type { IconType } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText } from '@elastic/eui';

import type { BadgeType } from '../../../types';
import { BetaBadge } from '../beta_badge';
import { SecondaryMenuItemComponent } from './item';
import { SecondaryMenuSectionComponent } from './section';
import { useMenuHeaderStyle } from '../../hooks/use_menu_header_style';
import { scrollLayoutStyles, useScroll } from '../../hooks/use_scroll';

export interface SecondaryMenuProps {
  badgeType?: BadgeType;
  children: ReactNode;
  footer?: ReactNode;
  /**
   * Primary-nav icon shown beside the header title (e.g. gear for Stack Management).
   */
  iconType?: IconType;
  isNew?: boolean;
  isPanel?: boolean;
  title: string;
}

interface SecondaryMenuComponent
  extends ForwardRefExoticComponent<SecondaryMenuProps & RefAttributes<HTMLDivElement>> {
  Item: typeof SecondaryMenuItemComponent;
  Section: typeof SecondaryMenuSectionComponent;
}

const SecondaryMenuBase = forwardRef<HTMLDivElement, SecondaryMenuProps>(
  ({ badgeType, children, footer, iconType, title, isNew = false }, ref) => {
    const headerStyle = useMenuHeaderStyle();
    const scrollStyles = useScroll(true);
    const showBadge = Boolean(badgeType && (badgeType !== 'new' || isNew));

    return (
      <div ref={ref} css={scrollLayoutStyles}>
        <EuiFlexGroup css={headerStyle} alignItems="center" gutterSize="s" responsive={false}>
          {iconType && (
            <EuiFlexItem grow={false}>
              <EuiIcon type={iconType} size="m" color="subdued" aria-hidden={true} />
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <EuiText size="s" color="subdued">
              <h4>{title}</h4>
            </EuiText>
          </EuiFlexItem>
          {/* Always show non-new badges, only show new ones if isNew check allows it */}
          {showBadge && badgeType && (
            <EuiFlexItem grow={false}>
              <BetaBadge type={badgeType} alignment="text-bottom" />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
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
