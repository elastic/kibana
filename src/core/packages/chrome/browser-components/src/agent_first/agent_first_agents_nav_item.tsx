/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  EuiIcon,
  EuiScreenReaderOnly,
  EuiText,
  EuiToolTip,
  euiFontSize,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { AiIcon, useAiButtonGradientStyles } from '@kbn/shared-ux-ai-components';
import { AGENT_FIRST_AGENTS_TOGGLE_ID } from './agent_first_nav_constants';

const NAV_ICON_WRAPPER_CLASS = 'kbnChromeNav-iconWrapper';
const TOOLTIP_OFFSET = 4;

const agentsToggleLabel = i18n.translate('core.ui.chrome.agentFirstNav.agentsToggle', {
  defaultMessage: 'Agents',
});

export interface AgentFirstAgentsNavItemProps {
  isActive: boolean;
  isCollapsed: boolean;
  onClick: () => void;
  'aria-describedby'?: string;
}

export const AgentFirstAgentsNavItem = ({
  isActive,
  isCollapsed,
  onClick,
  'aria-describedby': ariaDescribedBy,
}: AgentFirstAgentsNavItemProps) => {
  const euiThemeContext = useEuiTheme();
  const { euiTheme } = euiThemeContext;
  const { buttonCss: accentTileCss } = useAiButtonGradientStyles({
    variant: 'accent',
    iconOnly: true,
  });

  const buttonStyles = css`
    --menu-item-text-color: ${isActive
      ? euiTheme.components.buttons.textColorPrimary
      : euiTheme.components.buttons.textColorText};

    width: 100%;
    position: relative;
    overflow: hidden;
    align-items: center;
    justify-content: center;
    display: flex;
    flex-direction: column;
    gap: 3px;
    color: var(--menu-item-text-color);
    outline: none !important;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;

    .${NAV_ICON_WRAPPER_CLASS} {
      position: relative;
      display: flex;
      justify-content: center;
      align-items: center;
      height: ${euiTheme.size.xl};
      width: ${euiTheme.size.xl};
      border-radius: ${euiTheme.border.radius.medium};
      z-index: 1;
    }

    .${NAV_ICON_WRAPPER_CLASS}::before {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: ${euiTheme.border.radius.medium};
      background-color: transparent;
      z-index: 0;
    }

    &:focus-visible .${NAV_ICON_WRAPPER_CLASS} {
      border: ${euiTheme.border.width.thick} solid
        ${isActive ? euiTheme.colors.textPrimary : euiTheme.colors.textParagraph};
    }

    &:hover:not(:disabled) .${NAV_ICON_WRAPPER_CLASS}::before {
      background-color: ${isActive
        ? 'transparent'
        : euiTheme.components.buttons.backgroundTextHover};
    }

    &:active:not(:disabled) .${NAV_ICON_WRAPPER_CLASS}::before {
      background-color: ${isActive
        ? 'transparent'
        : euiTheme.components.buttons.backgroundTextActive};
    }
  `;

  const inactiveIconWrapperStyles = css`
    background-color: ${euiTheme.colors.backgroundTransparent};
  `;

  const labelStyles = css`
    ${euiFontSize(euiThemeContext, 'xxs', { unit: 'px' })};
    font-weight: ${euiTheme.font.weight.semiBold};
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
    max-width: 100%;
    padding: 0 ${euiTheme.size.s};
  `;

  const menuItem = (
    <button
      type="button"
      id={AGENT_FIRST_AGENTS_TOGGLE_ID}
      css={buttonStyles}
      data-menu-item={true}
      data-highlighted={isActive ? 'true' : 'false'}
      data-test-subj="agentFirstNavAgentsToggle"
      aria-describedby={ariaDescribedBy}
      aria-pressed={isActive}
      onClick={onClick}
    >
      <div
        className={NAV_ICON_WRAPPER_CLASS}
        css={isActive ? accentTileCss : inactiveIconWrapperStyles}
      >
        {isActive ? (
          <EuiIcon aria-hidden type="productAgent" color="textInverse" />
        ) : (
          <AiIcon iconType="productAgent" size="m" aria-hidden />
        )}
      </div>
      {isCollapsed ? (
        <EuiScreenReaderOnly>
          <EuiText>{agentsToggleLabel}</EuiText>
        </EuiScreenReaderOnly>
      ) : (
        <EuiText textAlign="center" css={labelStyles}>
          {agentsToggleLabel}
        </EuiText>
      )}
    </button>
  );

  if (isCollapsed) {
    return (
      <EuiToolTip
        anchorProps={{
          css: css`
            display: flex;
            justify-content: center;
            width: 100%;
          `,
        }}
        content={agentsToggleLabel}
        disableScreenReaderOutput
        position="right"
        repositionOnScroll
        offset={TOOLTIP_OFFSET}
      >
        {menuItem}
      </EuiToolTip>
    );
  }

  return menuItem;
};
