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

import { AiButton, type AiButtonVariant } from './ai_button';

interface StoryArgs {
  label: string;
  variant: AiButtonVariant;
  iconOnlyVariant: Exclude<AiButtonVariant, 'iconOnly'>;
  size: 's' | 'm';
  isDisabled: boolean;
  withIcon: boolean;
}

export default {
  title: 'AI components/AiButton',
  description: 'A wrapper around EuiButton that applies an “AI” gradient background and text.',
  argTypes: {
    label: { control: 'text' },
    variant: { control: 'select', options: ['secondary', 'primary', 'empty', 'iconOnly'] },
    iconOnlyVariant: { control: 'select', options: ['secondary', 'primary', 'empty'] },
    size: { control: 'select', options: ['s', 'm'] },
    isDisabled: { control: 'boolean' },
    withIcon: { control: 'boolean' },
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

export const Default: StoryObj<StoryArgs> = {
  render: (args) => {
    const { label, variant, iconOnlyVariant, size, isDisabled, withIcon } = args;

    const iconProps = withIcon ? { iconType: 'sparkles', iconSide: 'left' as const } : {};

    if (variant === 'iconOnly') {
      return (
        <AiButton
          size={size}
          isDisabled={isDisabled}
          aria-label={label}
          iconType="sparkles"
          variant="iconOnly"
          iconOnlyVariant={iconOnlyVariant}
        />
      );
    }

    return (
      <AiButton size={size} isDisabled={isDisabled} variant={variant} {...iconProps}>
        {label}
      </AiButton>
    );
  },
  args: {
    label: 'AI Assistant',
    variant: 'secondary',
    iconOnlyVariant: 'secondary',
    size: 's',
    isDisabled: false,
    withIcon: false,
  },
};
