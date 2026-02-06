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
import { EuiTitle, useEuiTheme, EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

import type { BadgeType } from '../../../types';
import { BetaBadge } from '../beta_badge';
import { SecondaryMenuItemComponent } from './item';
import { SecondaryMenuSectionComponent } from './section';
import { useMenuHeaderStyle } from '../../hooks/use_menu_header_style';

export interface SecondaryMenuProps {
  badgeType?: BadgeType;
  children: ReactNode;
  isPanel?: boolean;
  title: string;
  showSecondaryPanel?: boolean;
  onToggleSecondaryPanel?: (show: boolean) => void;
}

interface SecondaryMenuComponent
  extends ForwardRefExoticComponent<SecondaryMenuProps & RefAttributes<HTMLDivElement>> {
  Item: typeof SecondaryMenuItemComponent;
  Section: typeof SecondaryMenuSectionComponent;
}

const SecondaryMenuBase = forwardRef<HTMLDivElement, SecondaryMenuProps>(
  ({ badgeType, children, title, isPanel, showSecondaryPanel, onToggleSecondaryPanel }, ref) => {
    const { euiTheme } = useEuiTheme();
    const headerStyle = useMenuHeaderStyle();

    const titleWithBadgeStyles = css`
      display: flex;
      align-items: center;
      gap: ${euiTheme.size.xs};
      flex: 1;
      min-width: 0;
      overflow: hidden;
    `;

    const titleTextStyles = css`
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    `;

    const headerContainerStyles = css`
      display: flex;
      align-items: center;
      gap: ${euiTheme.size.xs};
      width: 100%;
    `;

    const titleStyles = css`
      ${headerStyle}
      background: ${euiTheme.colors.backgroundBasePlain};
      border-radius: ${euiTheme.border.radius.medium};
    `;

    const handleToggle = () => {
      if (onToggleSecondaryPanel) {
        onToggleSecondaryPanel(!showSecondaryPanel);
      }
    };

    return (
      <div ref={ref}>
        <EuiTitle css={titleStyles} size="xs">
          <div css={headerContainerStyles}>
            <div css={titleWithBadgeStyles}>
              <h4 css={titleTextStyles}>{title}</h4>
              {badgeType && <BetaBadge type={badgeType} alignment="text-bottom" />}
            </div>
            {onToggleSecondaryPanel && (
              // Show toggle in panel when panel is ON, or in popover when panel is OFF
              ((isPanel && showSecondaryPanel) || (!isPanel && !showSecondaryPanel)) && (
                <EuiToolTip
                  content={i18n.translate('core.ui.chrome.sideNavigation.toggleSecondaryPanelTooltip', {
                    defaultMessage: showSecondaryPanel
                      ? 'Hide secondary navigation'
                      : 'Show secondary navigation',
                  })}
                  position={isPanel ? 'left' : 'right'}
                >
                  <EuiButtonIcon
                    iconType={showSecondaryPanel ? 'transitionLeftOut' : 'transitionLeftIn'}
                    onClick={handleToggle}
                    aria-label={i18n.translate('core.ui.chrome.sideNavigation.toggleSecondaryPanelLabel', {
                      defaultMessage: showSecondaryPanel
                        ? 'Hide secondary navigation'
                        : 'Show secondary navigation',
                    })}
                    size="s"
                    color="text"
                    data-test-subj={isPanel ? 'secondaryNavToggle' : 'secondaryNavToggleFromPopover'}
                    css={css`
                      flex-shrink: 0;
                    `}
                  />
                </EuiToolTip>
              )
            )}
          </div>
        </EuiTitle>
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
