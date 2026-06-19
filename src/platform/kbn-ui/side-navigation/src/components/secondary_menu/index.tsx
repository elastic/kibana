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
import { EuiButtonIcon, EuiTitle, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

import type { BadgeType, PanelHeaderAction } from '../../../types';
import { BetaBadge } from '../beta_badge';
import { SecondaryMenuItemComponent } from './item';
import { SecondaryMenuSectionComponent } from './section';
import { useMenuHeaderStyle } from '../../hooks/use_menu_header_style';

export interface SecondaryMenuProps {
  badgeType?: BadgeType;
  children: ReactNode;
  isNew?: boolean;
  isPanel?: boolean;
  panelHeaderActions?: PanelHeaderAction[];
  title: string;
}

interface SecondaryMenuComponent
  extends ForwardRefExoticComponent<SecondaryMenuProps & RefAttributes<HTMLDivElement>> {
  Item: typeof SecondaryMenuItemComponent;
  Section: typeof SecondaryMenuSectionComponent;
}

const SecondaryMenuBase = forwardRef<HTMLDivElement, SecondaryMenuProps>(
  ({ badgeType, children, isPanel = false, isNew = false, panelHeaderActions, title }, ref) => {
    const { euiTheme } = useEuiTheme();
    const headerStyle = useMenuHeaderStyle();

    const headerRowStyles = css`
      align-items: center;
      background: ${euiTheme.colors.backgroundBasePlain};
      border-radius: ${euiTheme.border.radius.medium};
      display: flex;
      gap: ${euiTheme.size.s};
      justify-content: space-between;
      ${headerStyle}
    `;

    const titleGroupStyles = css`
      align-items: center;
      display: flex;
      gap: ${euiTheme.size.xs};
      min-width: 0;
    `;

    const headerActionsStyles = css`
      display: flex;
      flex-shrink: 0;
      gap: ${euiTheme.size.xs};
    `;

    return (
      <div ref={ref}>
        <div css={headerRowStyles}>
          <div css={titleGroupStyles}>
            <EuiTitle size="xs">
              <h4>{title}</h4>
            </EuiTitle>
            {/* Always show non-new badges, only show new ones if isNew check allows it */}
            {badgeType && (badgeType !== 'new' || isNew) && (
              <BetaBadge type={badgeType} alignment="text-bottom" />
            )}
          </div>
          {panelHeaderActions && panelHeaderActions.length > 0 && (
            <div css={headerActionsStyles}>
              {panelHeaderActions.map((action) => (
                <EuiButtonIcon
                  key={action.id}
                  id={action.id}
                  aria-label={action['aria-label']}
                  color="text"
                  data-test-subj={action['data-test-subj']}
                  display="empty"
                  iconType={action.iconType}
                  onClick={action.onClick}
                  size="xs"
                />
              ))}
            </div>
          )}
        </div>
        {children}
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
