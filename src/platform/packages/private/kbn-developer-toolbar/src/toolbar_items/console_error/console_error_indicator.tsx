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
  EuiThemeProvider,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { ConsoleMonitor } from './console_monitor';

// No auto-dismiss animation in inline light mode

const getErrorBoxStyles = (euiTheme: EuiThemeComputed, errorType: 'error' | 'warn') => css`
  background-color: #FCD883;
  color: ${euiTheme.colors.text};

  display: inline-flex;
  align-items: center;
  white-space: nowrap;
  animation: none;
  position: relative; // ensure it flows inside toolbar layout

  max-width: min(720px, 100%);
  padding: ${euiTheme.size.xxs} ${euiTheme.size.s};
  border-radius: 4px;
  margin-top: calc(-1 * ${euiTheme.size.xs});
`;

const ErrorInlineBox: React.FC<{
  error: { message: string; type: 'error' | 'warn' };
  errorCount: number;
  iconType: any;
  iconColor: any;
  dismissError: () => void;
}> = ({ error, errorCount, iconType, iconColor, dismissError }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <div css={getErrorBoxStyles(euiTheme, error.type)} key={error.message}>
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

export const ConsoleErrorIndicator: React.FC = () => {
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

      // Do not auto-dismiss; keep visible until user closes
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
    <EuiThemeProvider colorMode={'light'} wrapperProps={{ cloneElement: true }}>
      <ErrorInlineBox
        error={error}
        errorCount={errorCount}
        iconType={iconType}
        iconColor={iconColor}
        dismissError={dismissError}
      />
    </EuiThemeProvider>
  );
};
