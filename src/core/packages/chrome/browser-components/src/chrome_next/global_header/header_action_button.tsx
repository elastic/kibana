/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';
import React from 'react';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';

const ACTION_BUTTON_SIZE = 32;

const baseStyles = css({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxSizing: 'border-box',
  width: ACTION_BUTTON_SIZE,
  height: ACTION_BUTTON_SIZE,
  padding: 0,
  background: 'transparent',
  cursor: 'pointer',
  '&:hover': { background: 'var(--action-btn-hover)' },
  '&:focus-visible': {
    outline: '2px solid var(--action-btn-focus)',
    outlineOffset: -2,
  },
});

const borderedStyles = css({
  border: '1px solid var(--action-btn-border)',
});

const plainStyles = css({
  border: 'none',
});

export interface HeaderActionButtonProps
  extends Pick<React.AriaAttributes, 'aria-expanded' | 'aria-haspopup'> {
  variant: 'bordered' | 'plain';
  children: ReactNode;
  onClick: () => void;
  'aria-label': string;
  'data-test-subj'?: string;
}

export const HeaderActionButton = React.forwardRef<HTMLButtonElement, HeaderActionButtonProps>(
  (
    {
      variant,
      children,
      onClick,
      'aria-label': ariaLabel,
      'aria-expanded': ariaExpanded,
      'aria-haspopup': ariaHaspopup,
      'data-test-subj': dataTestSubj,
    },
    ref
  ) => {
    const { euiTheme } = useEuiTheme();

    return (
      <button
        ref={ref}
        type="button"
        aria-expanded={ariaExpanded}
        aria-haspopup={ariaHaspopup}
        aria-label={ariaLabel}
        data-test-subj={dataTestSubj}
        css={[
          baseStyles,
          variant === 'bordered' ? borderedStyles : plainStyles,
          { borderRadius: euiTheme.border.radius.medium },
        ]}
        style={
          {
            '--action-btn-border': euiTheme.colors.borderBasePlain,
            '--action-btn-hover': euiTheme.colors.backgroundBaseInteractiveHover,
            '--action-btn-focus': euiTheme.colors.primary,
          } as React.CSSProperties
        }
        onClick={onClick}
      >
        {children}
      </button>
    );
  }
);

HeaderActionButton.displayName = 'HeaderActionButton';
