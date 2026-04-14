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
import { SecondaryMenuSidePanelProvider } from './side_panel_context';
import { useMenuHeaderStyle } from '../../hooks/use_menu_header_style';

export interface SecondaryMenuProps {
  badgeType?: BadgeType;
  children: ReactNode;
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
  ({ badgeType, children, title, isNew = false, isPanel = false }, ref) => {
    const { euiTheme } = useEuiTheme();
    const headerStyle = useMenuHeaderStyle();

    const titleWithBadgeStyles = css`
      display: flex;
      align-items: flex-start;
      gap: ${euiTheme.size.xs};
      min-width: 0;
      width: 100%;
      text-align: start;

      h4 {
        margin-block: 0;
      }
    `;

    /** Same inset as the flyout panel title (popover + side panel). Wrapper avoids `EuiTitle` padding quirks. */
    const titleShellStyles = css`
      ${headerStyle}
      box-sizing: border-box;
      display: flex;
      align-items: flex-start;
      width: 100%;
      background: ${isPanel ? euiTheme.colors.backgroundBasePlain : 'transparent'};
      border-radius: 0;
      text-align: start;
      padding: ${euiTheme.size.base} 20px 0 20px;
      height: fit-content;
      min-height: 0;
    `;

    const titleTypographyStyles = css`
      flex: 1;
      min-width: 0;
      width: 100%;
    `;

    return (
      <SecondaryMenuSidePanelProvider value={isPanel}>
        <div ref={ref}>
          <div css={titleShellStyles}>
            <EuiTitle css={titleTypographyStyles} size="xs">
              <div css={titleWithBadgeStyles}>
                <h4>{title}</h4>
                {/* Always show non-new badges, only show new ones if isNew check allows it */}
                {badgeType && (badgeType !== 'new' || isNew) && (
                  <BetaBadge type={badgeType} alignment="text-bottom" />
                )}
              </div>
            </EuiTitle>
          </div>
          {children}
        </div>
      </SecondaryMenuSidePanelProvider>
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
