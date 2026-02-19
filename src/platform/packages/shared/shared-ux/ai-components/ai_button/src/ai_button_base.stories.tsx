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
import type { EuiButtonSize, EuiButtonEmptySizes } from '@elastic/eui';
import { AiButton } from './ai_button';
import { AiButtonDefault } from './ai_button_default';
import { AiButtonEmpty } from './ai_button_empty';
import { AiButtonIcon } from './ai_button_icon';
import type { AiButtonVariant } from './types';

type AiIconType = 'aiAssistantLogo' | 'sparkles' | 'productAgent';

interface CommonStoryArgs {
  label: string;
  isDisabled: boolean;
  icon: AiIconType;
}

interface StoryArgs extends CommonStoryArgs {
  variant: AiButtonVariant;
  size: EuiButtonEmptySizes;
  withIcon: boolean;
  iconOnly: boolean;
}

interface ButtonComponentStoryArgs extends CommonStoryArgs {
  size: EuiButtonEmptySizes;
  iconSize?: EuiButtonSize;
  withIcon: boolean;
}

interface IconComponentStoryArgs extends CommonStoryArgs {
  size: EuiButtonEmptySizes;
  variant: AiButtonVariant;
}

export default {
  title: 'AI components/AiButton',
  description:
    'A wrapper around EuiButton/EuiButtonEmpty/EuiButtonIcon that applies an “AI” gradient background and text.',
  argTypes: {
    label: { control: 'text' },
    variant: { control: 'select', options: ['base', 'accent', 'empty', 'outlined'] },
    size: { control: 'select', options: ['xs', 's', 'm'] },
    isDisabled: { control: 'boolean' },
    withIcon: { control: 'boolean' },
    iconOnly: { control: 'boolean' },
    icon: { control: 'select', options: ['aiAssistantLogo', 'sparkles', 'productAgent'] },
  },
} as Meta<StoryArgs>;

export const Default: StoryObj<StoryArgs> = {
  render: (args) => {
    const { label, variant, size, isDisabled, withIcon, iconOnly, icon } = args;

    if (iconOnly) {
      return (
        <AiButtonIcon
          variant={variant}
          size={size}
          isDisabled={isDisabled}
          iconType={icon}
          aria-label={label}
        />
      );
    }

    if (variant === 'empty' || variant === 'outlined') {
      return (
        <AiButton
          variant={variant}
          size={size}
          isDisabled={isDisabled}
          {...(withIcon ? { iconType: icon } : {})}
        >
          {label}
        </AiButton>
      );
    }

    const buttonSize: EuiButtonSize = size === 'm' ? 'm' : 's';

    if (withIcon) {
      return (
        <AiButton variant={variant} size={buttonSize} isDisabled={isDisabled} iconType={icon}>
          {label}
        </AiButton>
      );
    }

    return (
      <AiButton variant={variant} size={buttonSize} isDisabled={isDisabled}>
        {label}
      </AiButton>
    );
  },
  args: {
    label: 'AI Assistant',
    variant: 'base',
    size: 's',
    isDisabled: false,
    withIcon: false,
    iconOnly: false,
    icon: 'aiAssistantLogo',
  },
};

export const Base: StoryObj<ButtonComponentStoryArgs> = {
  render: ({ label, size, iconSize, isDisabled, withIcon, icon }) => {
    const buttonSize: EuiButtonSize = size === 'm' ? 'm' : 's';
    return (
      <AiButtonDefault
        size={buttonSize}
        isDisabled={isDisabled}
        {...(withIcon ? { iconType: icon, iconSize } : {})}
      >
        {label}
      </AiButtonDefault>
    );
  },
  args: {
    label: 'AI Assistant',
    size: 's',
    isDisabled: false,
    withIcon: false,
    icon: 'aiAssistantLogo',
  },
};

export const Accent: StoryObj<ButtonComponentStoryArgs> = {
  render: ({ label, size, iconSize, isDisabled, withIcon, icon }) => {
    const buttonSize: EuiButtonSize = size === 'm' ? 'm' : 's';
    return (
      <AiButtonDefault
        variant="accent"
        size={buttonSize}
        isDisabled={isDisabled}
        {...(withIcon ? { iconType: icon, iconSize } : {})}
      >
        {label}
      </AiButtonDefault>
    );
  },
  args: {
    label: 'AI Assistant',
    size: 's',
    isDisabled: false,
    withIcon: true,
    icon: 'aiAssistantLogo',
  },
};

export const Empty: StoryObj<ButtonComponentStoryArgs> = {
  render: ({ label, size, iconSize, isDisabled, withIcon, icon }) => (
    <AiButtonEmpty
      size={size}
      isDisabled={isDisabled}
      {...(withIcon ? { iconType: icon, iconSize } : {})}
    >
      {label}
    </AiButtonEmpty>
  ),
  args: {
    label: 'AI Assistant',
    size: 's',
    isDisabled: false,
    withIcon: true,
    icon: 'aiAssistantLogo',
  },
};

export const Icon: StoryObj<IconComponentStoryArgs> = {
  render: ({ label, size, isDisabled, variant, icon }) => (
    <AiButtonIcon
      size={size}
      isDisabled={isDisabled}
      variant={variant}
      iconType={icon}
      aria-label={label}
    />
  ),
  args: {
    label: 'AI Assistant',
    size: 's',
    isDisabled: false,
    variant: 'base',
    icon: 'aiAssistantLogo',
  },
};
