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

const FADE_WIDTH = 200;

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
  z-index: 100;
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
    monitor.startMonitoring();

    const unsubscribe = monitor.subscribe((newError) => {
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
      unsubscribe();
      monitor.destroy();
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
        <EuiFlexItem
          css={css`
            min-width: 0; // allow text truncation;
          `}
        >
          <EuiText size="xs" color="inherit" className="eui-textTruncate">
            <span>{error.message}</span>
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
