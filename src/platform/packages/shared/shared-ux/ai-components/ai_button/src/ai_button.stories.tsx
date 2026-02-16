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
import { AiButtonDefault } from './ai_button_default';
import { AiButtonAccent } from './ai_button_accent';
import { AiButtonEmpty } from './ai_button_empty';
import { AiButtonIcon } from './ai_button_icon';
import { AiButton } from './ai_button';
import type { AiButtonVariant } from './ai_button_base';

interface StoryArgs {
  label: string;
  size: EuiButtonSize;
  isDisabled: boolean;
  withIcon: boolean;
  icon: 'aiAssistantLogo' | 'sparkles' | 'productAgent';
}

export default {
  title: 'AI components/AiButton',
  description:
    'A wrapper around EuiButton/EuiButtonEmpty/EuiButtonIcon that applies an “AI” gradient background and text.',
  argTypes: {
    label: { control: 'text' },
    isDisabled: { control: 'boolean' },
    withIcon: { control: 'boolean' },
    icon: { control: 'select', options: ['aiAssistantLogo', 'sparkles', 'productAgent'] },
  },
} as Meta<StoryArgs>;

export const Default: StoryObj<StoryArgs> = {
  render: (args) => {
    const { label, size, isDisabled, withIcon, icon } = args;

    const iconProps = withIcon ? { iconType: icon } : {};

    return (
      <AiButtonDefault size={size} isDisabled={isDisabled} {...iconProps}>
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
  argTypes: {
    size: { control: 'select', options: ['s', 'm'] },
  },
};

export const Accent: StoryObj<StoryArgs> = {
  render: (args) => {
    const { label, size, isDisabled, withIcon, icon } = args;

    const iconProps = withIcon ? { iconType: icon } : {};

    return (
      <AiButtonAccent size={size} isDisabled={isDisabled} {...iconProps}>
        {label}
      </AiButtonAccent>
    );
  },
  args: {
    label: 'AI Assistant',
    size: 's',
    isDisabled: false,
    withIcon: true,
    icon: 'aiAssistantLogo',
  },
  argTypes: {
    size: { control: 'select', options: ['s', 'm'] },
  },
};

export const Empty: StoryObj<StoryArgs> = {
  render: (args) => {
    const { label, size, isDisabled, withIcon, icon } = args;

    const iconProps = withIcon ? { iconType: icon } : {};

    return (
      <AiButtonEmpty size={size} isDisabled={isDisabled} {...iconProps}>
        {label}
      </AiButtonEmpty>
    );
  },
  args: {
    label: 'AI Assistant',
    size: 's',
    isDisabled: false,
    withIcon: true,
    icon: 'aiAssistantLogo',
  },
  argTypes: {
    size: { control: 'select', options: ['xs', 's', 'm'] },
  },
};

export const Outlined: StoryObj<StoryArgs> = {
  render: (args) => {
    const { label, size, isDisabled, withIcon, icon } = args;

    const iconProps = withIcon ? { iconType: icon } : {};

    return (
      <AiButton variant="outlined" size={size} isDisabled={isDisabled} {...iconProps}>
        {label}
      </AiButton>
    );
  },
  args: {
    label: 'AI Assistant',
    size: 's',
    isDisabled: false,
    withIcon: true,
    icon: 'aiAssistantLogo',
  },
  argTypes: {
    size: { control: 'select', options: ['xs', 's', 'm'] },
  },
};

interface IconOnlyStoryArgs {
  label: string;
  size: EuiButtonSize;
  isDisabled: boolean;
  icon: 'aiAssistantLogo' | 'sparkles' | 'productAgent';
  variant: AiButtonVariant;
  appName: string;
}

export const IconOnly: StoryObj<IconOnlyStoryArgs> = {
  parameters: {
    controls: {
      exclude: ['withIcon'],
    },
  },
  render: (args) => {
    const { label, size, isDisabled, icon, variant, appName } = args;

    return (
      <AiButtonIcon
        size={size}
        isDisabled={isDisabled}
        aria-label={label}
        iconType={icon}
        variant={variant}
        appName={appName}
      />
    );
  },
  args: {
    label: 'AI Assistant',
    size: 's',
    isDisabled: false,
    icon: 'aiAssistantLogo',
    variant: 'base',
    appName: 'AI Assistant',
  },
  argTypes: {
    label: { control: 'text' },
    appName: { control: 'text' },
    isDisabled: { control: 'boolean' },
    icon: { control: 'select', options: ['aiAssistantLogo', 'sparkles', 'productAgent'] },
    variant: { control: 'select', options: ['base', 'accent', 'empty', 'outlined'] },
    size: { control: 'select', options: ['xs', 's', 'm'] },
  },
};
