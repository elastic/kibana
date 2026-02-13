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
import { AiButtonBase, type AiButtonBaseProps } from './ai_button_base';

interface StoryArgs {
  label: string;
  variant: AiButtonBaseProps['variant'];
  size: 'xs' | 's' | 'm';
  isDisabled: boolean;
  withIcon: boolean;
}

export default {
  title: 'AI components/AiButton',
  description:
    'A wrapper around EuiButton/EuiButtonEmpty/EuiButtonIcon that applies an “AI” gradient background and text.',
  argTypes: {
    label: { control: 'text' },
    isDisabled: { control: 'boolean' },
    withIcon: { control: 'boolean' },
  },
} as Meta<StoryArgs>;

export const Default: StoryObj<StoryArgs> = {
  render: (args) => {
    const { label, variant, size, isDisabled, withIcon } = args;

    const iconProps = withIcon ? { iconType: 'sparkles' } : {};

    return (
      <AiButtonBase
        size={size as 's' | 'm'}
        isDisabled={isDisabled}
        variant={variant}
        {...iconProps}
      >
        {label}
      </AiButtonBase>
    );
  },
  args: {
    label: 'AI Assistant',
    variant: 'secondary',
    size: 's',
    isDisabled: false,
    withIcon: false,
  },
  argTypes: {
    variant: { control: 'select', options: ['secondary', 'primary'] },
    size: { control: 'select', options: ['s', 'm'] },
  },
};

export const Empty: StoryObj<StoryArgs> = {
  render: (args) => {
    const { label, size, isDisabled, withIcon } = args;
    const iconProps = withIcon ? { iconType: 'sparkles' } : {};

    return (
      <AiButtonBase
        size={size as 'xs' | 's' | 'm'}
        isDisabled={isDisabled}
        variant="empty"
        {...iconProps}
      >
        {label}
      </AiButtonBase>
    );
  },
  args: {
    label: 'AI Assistant',
    size: 's',
    isDisabled: false,
    withIcon: false,
  },
  argTypes: {
    size: { control: 'select', options: ['xs', 's', 'm'] },
  },
};

export const IconOnly: StoryObj<StoryArgs> = {
  render: (args) => {
    const { label, variant, size, isDisabled } = args;

    return (
      <AiButtonBase
        iconOnly
        size={size as 'xs' | 's' | 'm'}
        isDisabled={isDisabled}
        aria-label={label}
        iconType="sparkles"
        variant={variant}
      />
    );
  },
  args: {
    label: 'AI Assistant',
    variant: 'secondary',
    size: 's',
    isDisabled: false,
  },
  argTypes: {
    variant: { control: 'select', options: ['secondary', 'primary', 'empty'] },
    size: { control: 'select', options: ['xs', 's', 'm'] },
    withIcon: { table: { disable: true } },
  },
};
