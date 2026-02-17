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
import type { EuiButtonSize } from '@elastic/eui';
import { AiButton } from './ai_button';
import { AiButtonDefault } from './ai_button_default';
import { AiButtonAccent } from './ai_button_accent';
import { AiButtonEmpty } from './ai_button_empty';
import { AiButtonIcon } from './ai_button_icon';
import type { AiButtonVariant } from './ai_button_base';

interface StoryArgs {
  label: string;
  appName: string;
  variant: AiButtonVariant;
  size: EuiButtonSize;
  isDisabled: boolean;
  withIcon: boolean;
  iconOnly: boolean;
  icon: 'aiAssistantLogo' | 'sparkles' | 'productAgent';
}

interface ButtonComponentStoryArgs {
  label: string;
  size: EuiButtonSize;
  isDisabled: boolean;
  withIcon: boolean;
  icon: 'aiAssistantLogo' | 'sparkles' | 'productAgent';
}

interface IconComponentStoryArgs {
  label: string;
  appName: string;
  size: EuiButtonSize;
  isDisabled: boolean;
  variant: AiButtonVariant;
  icon: 'aiAssistantLogo' | 'sparkles' | 'productAgent';
}

export default {
  title: 'AI components/AiButton',
  description:
    'A wrapper around EuiButton/EuiButtonEmpty/EuiButtonIcon that applies an “AI” gradient background and text.',
  argTypes: {
    label: { control: 'text' },
    appName: { control: 'text' },
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
    const { label, appName, variant, size, isDisabled, withIcon, iconOnly, icon } = args;
    const iconProps = withIcon ? { iconType: icon } : {};

    if (iconOnly) {
      return (
        <AiButton
          variant={variant}
          size={size}
          isDisabled={isDisabled}
          iconOnly
          iconType={icon}
          appName={appName}
          aria-label={label}
        />
      );
    }

    return (
      <AiButton
        iconOnly={false}
        variant={variant}
        size={size}
        isDisabled={isDisabled}
        {...iconProps}
      >
        {label}
      </AiButton>
    );
  },
  args: {
    label: 'AI Assistant',
    appName: 'AI Assistant',
    variant: 'base',
    size: 's',
    isDisabled: false,
    withIcon: false,
    iconOnly: false,
    icon: 'aiAssistantLogo',
  },
};

export const Base: StoryObj<ButtonComponentStoryArgs> = {
  render: ({ label, size, isDisabled, withIcon, icon }) => (
    <AiButtonDefault size={size} isDisabled={isDisabled} {...(withIcon ? { iconType: icon } : {})}>
      {label}
    </AiButtonDefault>
  ),
  args: {
    label: 'AI Assistant',
    size: 's',
    isDisabled: false,
    withIcon: false,
    icon: 'aiAssistantLogo',
  },
};

export const Accent: StoryObj<ButtonComponentStoryArgs> = {
  render: ({ label, size, isDisabled, withIcon, icon }) => (
    <AiButtonAccent size={size} isDisabled={isDisabled} {...(withIcon ? { iconType: icon } : {})}>
      {label}
    </AiButtonAccent>
  ),
  args: {
    label: 'AI Assistant',
    size: 's',
    isDisabled: false,
    withIcon: true,
    icon: 'aiAssistantLogo',
  },
};

export const Empty: StoryObj<ButtonComponentStoryArgs> = {
  render: ({ label, size, isDisabled, withIcon, icon }) => (
    <AiButtonEmpty size={size} isDisabled={isDisabled} {...(withIcon ? { iconType: icon } : {})}>
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
  render: ({ label, appName, size, isDisabled, variant, icon }) => (
    <AiButtonIcon
      size={size}
      isDisabled={isDisabled}
      variant={variant}
      iconType={icon}
      appName={appName}
      aria-label={label}
    />
  ),
  args: {
    label: 'AI Assistant',
    appName: 'AI Assistant',
    size: 's',
    isDisabled: false,
    variant: 'base',
    icon: 'aiAssistantLogo',
  },
};
