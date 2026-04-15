/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { EuiThemeComputed } from '@elastic/eui';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiNotificationBadge,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css, keyframes } from '@emotion/react';
import type { ConsoleErrorInfo } from './console_monitor';
import {
  CONSOLE_ERROR_DISPLAY_DURATION,
  TOOLBAR_ERROR_COLOR,
  TOOLBAR_WARNING_COLOR,
} from './constants';

const fadeOut = keyframes`
  0% {
    opacity: 1;
  }
  95% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
`;

const FADE_WIDTH = 200;

const getErrorOverlayStyles = (euiTheme: EuiThemeComputed, errorType: 'error' | 'warn') => css`
  background-color: ${errorType === 'error'
    ? euiTheme.colors.backgroundBaseDanger
    : euiTheme.colors.backgroundBaseWarning};
  color: ${euiTheme.colors.textParagraph};

  display: flex;
  align-items: center;
  white-space: nowrap;
  animation: ${fadeOut} ${CONSOLE_ERROR_DISPLAY_DURATION}ms ease-out forwards;
  position: absolute;

  mask-image: linear-gradient(
    to left,
    transparent 0%,
    transparent 60px,
    rgba(0, 0, 0, 0.4) ${FADE_WIDTH * 0.5}px,
    rgba(0, 0, 0, 0.8) ${FADE_WIDTH * 0.75}px,
    black ${FADE_WIDTH}px
  );

  top: 0;
  bottom: 0;
  left: 0;
  width: auto;
  max-width: min(calc(720px + ${FADE_WIDTH}px), 100%);
  padding: ${euiTheme.size.xxs} ${euiTheme.size.s};
  padding-right: ${FADE_WIDTH}px;
  height: 100%;
  z-index: ${euiTheme.levels.toast};
`;

export interface ConsoleErrorIndicatorProps {
  error: ConsoleErrorInfo | null;
  errorCount: number;
  onDismiss: () => void;
}

export const ConsoleErrorIndicator: React.FC<ConsoleErrorIndicatorProps> = ({
  error,
  errorCount,
  onDismiss,
}) => {
  const { euiTheme } = useEuiTheme();

  if (!error) {
    return null;
  }

  const iconColor = error.type === 'error' ? 'danger' : 'warning';

  return (
    <div css={getErrorOverlayStyles(euiTheme, error.type)} key={error.message}>
      <EuiFlexGroup
        gutterSize="xs"
        alignItems="center"
        responsive={false}
        css={css`
          min-width: 0; // allow text truncation;
        `}
      >
        <EuiFlexItem
          grow={false}
          css={css`
            line-height: 0;
          `}
        >
          <EuiToolTip content={`Total recent console issues: ${errorCount}`}>
            <EuiNotificationBadge
              color="accent"
              size="s"
              css={css`
                background-color: ${error.type === 'error'
                  ? TOOLBAR_ERROR_COLOR
                  : TOOLBAR_WARNING_COLOR};
              `}
            >
              {errorCount}
            </EuiNotificationBadge>
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem
          css={css`
            min-width: 0; // allow text truncation;
          `}
        >
          <EuiText
            size="xs"
            color="inherit"
            className="eui-textTruncate"
            css={css`
              line-height: 1;
            `}
          >
            <span>{error.message}</span>
          </EuiText>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="cross"
            color={iconColor}
            size="xs"
            onClick={onDismiss}
            aria-label="Dismiss console issues"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
