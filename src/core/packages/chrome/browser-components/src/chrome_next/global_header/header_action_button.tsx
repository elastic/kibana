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

export const headerButtonBaseStyles = css({
  display: 'inline-flex',
  alignItems: 'center',
  boxSizing: 'border-box',
  height: 32,
  background: 'transparent',
  cursor: 'pointer',
  '&:hover': { background: 'var(--header-btn-hover)' },
  '&:focus-visible': {
    outline: '2px solid var(--header-btn-focus)',
    outlineOffset: -2,
  },
});

export const headerButtonBorderedStyles = css({
  border: '1px solid var(--header-btn-border)',
});

const plainStyles = css({
  border: 'none',
});

const squareStyles = css({
  width: 32,
  padding: 0,
  justifyContent: 'center',
});

export const useHeaderButtonStyleVars = () => {
  const { euiTheme } = useEuiTheme();
  return {
    '--header-btn-border': euiTheme.colors.borderBasePlain,
    '--header-btn-hover': euiTheme.colors.backgroundBaseInteractiveHover,
    '--header-btn-focus': euiTheme.colors.primary,
    borderRadius: euiTheme.border.radius.medium,
  } as React.CSSProperties;
};

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
    const styleVars = useHeaderButtonStyleVars();

    return (
      <button
        ref={ref}
        type="button"
        aria-expanded={ariaExpanded}
        aria-haspopup={ariaHaspopup}
        aria-label={ariaLabel}
        data-test-subj={dataTestSubj}
        css={[
          headerButtonBaseStyles,
          squareStyles,
          variant === 'bordered' ? headerButtonBorderedStyles : plainStyles,
        ]}
        style={styleVars}
        onClick={onClick}
      >
        {children}
      </button>
    );
  }
);

HeaderActionButton.displayName = 'HeaderActionButton';
