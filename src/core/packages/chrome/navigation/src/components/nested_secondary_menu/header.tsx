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
import { EuiButtonIcon, EuiTitle, useEuiTheme, EuiToolTip } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

import { useMenuHeaderStyle } from '../../hooks/use_menu_header_style';
import { useNestedMenu } from './use_nested_menu';

export interface HeaderProps {
  title?: string;
  'aria-describedby'?: string;
  showSecondaryPanel?: boolean;
  onToggleSecondaryPanel?: (show: boolean) => void;
}

export const Header: FC<HeaderProps> = ({ title, 'aria-describedby': ariaDescribedBy, showSecondaryPanel, onToggleSecondaryPanel }) => {
  const { goBack, panelStackDepth } = useNestedMenu();
  const { euiTheme } = useEuiTheme();
  const headerStyle = useMenuHeaderStyle();
  
  // Only show toggle in nested panels (not root) when panel is OFF
  const shouldShowToggle = panelStackDepth > 0 && !showSecondaryPanel && onToggleSecondaryPanel;

  const titleStyle = css`
    align-items: center;
    background: ${euiTheme.colors.backgroundBasePlain};
    border-radius: ${euiTheme.border.radius.medium};
    display: flex;
    gap: ${euiTheme.size.s};
    ${headerStyle}
  `;

  const headerContainerStyles = css`
    display: flex;
    align-items: center;
    gap: ${euiTheme.size.s};
    flex: 1;
    min-width: 0;
  `;

  const titleWrapperStyles = css`
    flex: 1;
    min-width: 0;
    overflow: hidden;
  `;

  const titleTextStyles = css`
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `;

  const handleToggle = () => {
    if (onToggleSecondaryPanel) {
      onToggleSecondaryPanel(true);
    }
  };

  return (
    <div css={titleStyle}>
      <EuiButtonIcon
        aria-describedby={ariaDescribedBy}
        aria-label={i18n.translate('core.ui.chrome.sideNavigation.goBackButtonIconAriaLabel', {
          defaultMessage: 'Go back',
        })}
        color="text"
        iconType="arrowLeft"
        onClick={goBack}
      />
      <div css={headerContainerStyles}>
        {title && (
          <div css={titleWrapperStyles}>
            <EuiTitle size="xs">
              <h4 css={titleTextStyles}>{title}</h4>
            </EuiTitle>
          </div>
        )}
        {shouldShowToggle && (
          <EuiToolTip
            content={i18n.translate('core.ui.chrome.sideNavigation.toggleSecondaryPanelTooltip', {
              defaultMessage: 'Show secondary navigation',
            })}
            position="right"
          >
            <EuiButtonIcon
              iconType="transitionLeftIn"
              onClick={handleToggle}
              aria-label={i18n.translate('core.ui.chrome.sideNavigation.toggleSecondaryPanelLabel', {
                defaultMessage: 'Show secondary navigation',
              })}
              size="xs"
              color="text"
              data-test-subj="secondaryNavToggleFromPopover"
              css={css`
                flex-shrink: 0;
              `}
            />
          </EuiToolTip>
        )}
      </div>
    </div>
  );
};
