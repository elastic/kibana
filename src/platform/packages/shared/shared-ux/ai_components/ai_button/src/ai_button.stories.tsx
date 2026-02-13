/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { css } from '@emotion/react';
import { EuiThemeProvider, useEuiTheme } from '@elastic/eui';
import { AiButtonBase, type AiButtonBaseProps } from './ai_button_base';

interface StoryArgs {
  label: string;
  variant: AiButtonBaseProps['variant'];
  size: 'xs' | 's' | 'm';
  isDisabled: boolean;
  withIcon: boolean;
  colorMode: 'light' | 'dark';
}

const StoryBackground: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <div
      css={css`
        background: ${euiTheme.colors.body};
        padding: ${euiTheme.size.l};
        min-height: 100vh;
      `}
    >
      {children}
    </div>
  );
};

export default {
  title: 'AI components/AiButton',
  description: 'A wrapper around EuiButton that applies an “AI” gradient background and text.',
  argTypes: {
    label: { control: 'text' },
    isDisabled: { control: 'boolean' },
    withIcon: { control: 'boolean' },
    colorMode: { control: 'inline-radio', options: ['light', 'dark'] },
  },
  parameters: {
    docs: {
      description: {
        component:
          'TODO: Use the controls to switch variants. Hover/focus styles must be checked by manually hovering/focusing the button.',
      },
    },
  },
} as Meta<StoryArgs>;

const renderWithBackground = (children: React.ReactNode, colorMode: StoryArgs['colorMode']) => (
  <EuiThemeProvider colorMode={colorMode}>
    <StoryBackground>{children}</StoryBackground>
  </EuiThemeProvider>
);

export const Default: StoryObj<StoryArgs> = {
  render: (args) => {
    const { label, variant, size, isDisabled, withIcon, colorMode } = args;

    const iconProps = withIcon ? { iconType: 'sparkles', iconSide: 'left' as const } : {};
    const coercedSize: 's' | 'm' = size === 'xs' ? 's' : size;

    return renderWithBackground(
      <AiButtonBase size={coercedSize} isDisabled={isDisabled} variant={variant} {...iconProps}>
        {label}
      </AiButtonBase>,
      colorMode
    );
  },
  args: {
    label: 'AI Assistant',
    variant: 'secondary',
    size: 's',
    isDisabled: false,
    withIcon: false,
    colorMode: 'light',
  },
  argTypes: {
    variant: { control: 'select', options: ['secondary', 'primary'] },
    size: { control: 'select', options: ['s', 'm'] },
  },
};

export const Empty: StoryObj<StoryArgs> = {
  render: (args) => {
    const { label, size, isDisabled, withIcon, colorMode } = args;
    const iconProps = withIcon ? { iconType: 'sparkles', iconSide: 'left' as const } : {};

    return renderWithBackground(
      <AiButtonBase size={size} isDisabled={isDisabled} variant="empty" {...iconProps}>
        {label}
      </AiButtonBase>,
      colorMode
    );
  },
  args: {
    label: 'AI Assistant',
    size: 's',
    isDisabled: false,
    withIcon: false,
    colorMode: 'light',
  },
  argTypes: {
    size: { control: 'select', options: ['xs', 's', 'm'] },
  },
};

export const IconOnly: StoryObj<StoryArgs> = {
  render: (args) => {
    const { label, variant, size, isDisabled, colorMode } = args;

    return renderWithBackground(
      <AiButtonBase
        iconOnly
        size={size}
        isDisabled={isDisabled}
        aria-label={label}
        iconType="sparkles"
        variant={variant}
      />,
      colorMode
    );
  },
  args: {
    label: 'AI Assistant',
    variant: 'secondary',
    size: 's',
    isDisabled: false,
    withIcon: false,
    colorMode: 'light',
  },
  argTypes: {
    variant: { control: 'select', options: ['secondary', 'primary', 'empty'] },
    size: { control: 'select', options: ['xs', 's', 'm'] },
  },
};
