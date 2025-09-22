/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import type { EuiThemeComputed } from '@elastic/eui';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiNotificationBadge,
  EuiText,
  useEuiTheme,
  EuiToolTip,
} from '@elastic/eui';
import { css, keyframes } from '@emotion/react';
import { ConsoleMonitor } from './console_monitor';

const DISPLAY_DURATION = 5000;

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

const getErrorOverlayStyles = (euiTheme: EuiThemeComputed, errorType: 'error' | 'warn') => css`
  background-color: ${errorType === 'error'
    ? euiTheme.colors.backgroundBaseDanger
    : euiTheme.colors.backgroundBaseWarning};
  color: ${euiTheme.colors.textParagraph};

  display: flex;
  align-items: center;
  white-space: nowrap;
  animation: ${fadeOut} ${DISPLAY_DURATION}ms ease-out forwards;
  position: absolute;

  top: 0;
  bottom: 0;
  left: 0;
  width: auto;
  max-width: min(600px, 100%);
  padding: ${euiTheme.size.xxs} ${euiTheme.size.s};
  height: 100%;
  z-index: 100;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    right: -90px;
    bottom: 0;
    width: 90px;
    background: linear-gradient(
      270deg,
      transparent,
      ${errorType === 'error'
          ? euiTheme.colors.backgroundBaseDanger
          : euiTheme.colors.backgroundBaseWarning}
        100%
    );
  }
`;

export const ConsoleErrorIndicator: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const [error, setError] = useState<{ message: string; type: 'error' | 'warn' } | null>(null);
  const [errorCount, setErrorCount] = useState<number>(0);
  const monitorRef = useRef<ConsoleMonitor | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const monitor = new ConsoleMonitor();
    monitorRef.current = monitor;
    const destroy = monitor.init();

    const sub = monitor.error$.subscribe((newError) => {
      setError(newError);

      // Track error count - increment when new error, reset when cleared
      if (newError) {
        setErrorCount((prev) => prev + 1);
      } else {
        setErrorCount(0);
      }

      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set auto-dismiss timeout if there's an error
      if (newError) {
        timeoutRef.current = setTimeout(() => {
          monitorRef.current?.dismiss();
        }, DISPLAY_DURATION);
      }
    });

    return () => {
      sub.unsubscribe();
      destroy();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const dismissError = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    monitorRef.current?.dismiss();
  }, []);

  if (!error) {
    return null;
  }

  const iconType = error.type === 'error' ? 'warning' : 'alert';
  const iconColor = error.type === 'error' ? 'danger' : 'warning';

  // Truncate long messages to fit in the overlay
  const truncatedMessage =
    error.message.length > 60 ? `${error.message.substring(0, 60)}...` : error.message;

  return (
    <div css={getErrorOverlayStyles(euiTheme, error.type)} key={truncatedMessage}>
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          {errorCount > 1 ? (
            <EuiToolTip content={`Total recent errors: ${errorCount}`}>
              <EuiNotificationBadge color="accent" size="s">
                {errorCount}
              </EuiNotificationBadge>
            </EuiToolTip>
          ) : (
            <EuiIcon type={iconType} color={iconColor} size="s" />
          )}
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="xs" color="inherit">
            <span>{truncatedMessage}</span>
          </EuiText>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="cross"
            color={iconColor}
            size="xs"
            onClick={dismissError}
            aria-label="Dismiss all errors"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
