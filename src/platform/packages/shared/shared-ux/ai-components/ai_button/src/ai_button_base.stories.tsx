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
import type { AiButtonIconOnlyIconType, AiButtonIconType, AiButtonVariant } from './types';

type AiTextIconType = AiButtonIconType;
type AiIconOnlyIconType = AiButtonIconOnlyIconType;

const TEXT_ICON_OPTIONS: AiTextIconType[] = ['aiAssistantLogo', 'sparkles', 'productAgent'];
const ICON_ONLY_ICON_OPTIONS: AiIconOnlyIconType[] = [
  'aiAssistantLogo',
  'sparkles',
  'productAgent',
  'addToChat',
];

interface CommonStoryArgs {
  label: string;
  isDisabled: boolean;
  icon: AiTextIconType;
  size: EuiButtonEmptySizes;
  withIcon: boolean;
}

interface StoryArgs extends CommonStoryArgs {
  iconOnly: boolean;
  iconOnlyIcon: AiIconOnlyIconType;
  variant: AiButtonVariant;
}

interface ButtonComponentStoryArgs extends CommonStoryArgs {
  variant?: 'base' | 'accent';
  iconOnly: false;
}

interface EmptyComponentStoryArgs extends CommonStoryArgs {
  variant: 'empty' | 'outlined';
  iconOnly: false;
}

interface IconComponentStoryArgs extends Omit<CommonStoryArgs, 'icon' | 'withIcon'> {
  variant: AiButtonVariant;
  iconSize?: EuiButtonSize;
  iconOnly: true;
  icon: AiIconOnlyIconType;
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
  },
} as Meta<StoryArgs>;

export const Default: StoryObj<StoryArgs> = {
  argTypes: {
    icon: {
      control: 'select',
      options: TEXT_ICON_OPTIONS,
      if: { arg: 'iconOnly', truthy: false },
    },
    iconOnlyIcon: {
      control: 'select',
      options: ICON_ONLY_ICON_OPTIONS,
      if: { arg: 'iconOnly' },
    },
    withIcon: {
      if: { arg: 'iconOnly', truthy: false },
    },
  },
  render: ({ label, variant, size, isDisabled, withIcon, iconOnly, icon, iconOnlyIcon }) => {
    if (iconOnly) {
      return (
        <AiButton
          iconOnly
          variant={variant}
          size={size}
          isDisabled={isDisabled}
          iconType={iconOnlyIcon}
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
  },
  args: {
    label: 'AI Assistant',
    variant: 'base',
    size: 's',
    isDisabled: false,
    withIcon: false,
    iconOnly: false,
    icon: 'aiAssistantLogo',
    iconOnlyIcon: 'aiAssistantLogo',
  },
};

export const BaseOrAccent: StoryObj<ButtonComponentStoryArgs> = {
  argTypes: {
    variant: { control: 'select', options: ['base', 'accent'] },
    iconOnly: { control: false },
    icon: {
      control: 'select',
      options: TEXT_ICON_OPTIONS,
    },
  },
  render: ({ label, size, variant, isDisabled, withIcon, icon }) => {
    const buttonSize: EuiButtonSize = size === 'm' ? 'm' : 's';
    return (
      <AiButtonDefault
        variant={variant}
        size={buttonSize}
        isDisabled={isDisabled}
        {...(withIcon ? { iconType: icon } : {})}
      >
        {label}
      </AiButtonDefault>
    );
  },
  args: {
    label: 'AI Assistant',
    size: 's',
    variant: 'base',
    isDisabled: false,
    withIcon: false,
    icon: 'aiAssistantLogo',
  },
};

export const EmptyOrOutlined: StoryObj<EmptyComponentStoryArgs> = {
  argTypes: {
    variant: { control: 'select', options: ['empty', 'outlined'] },
    iconOnly: { control: false },
    icon: {
      control: 'select',
      options: TEXT_ICON_OPTIONS,
    },
  },
  render: ({ label, size, variant, isDisabled, withIcon, icon }) => {
    return (
      <AiButtonEmpty size={size} isDisabled={isDisabled} {...(withIcon ? { iconType: icon } : {})}>
        {label}
      </AiButtonEmpty>
    );
  },
  args: {
    label: 'AI Assistant',
    variant: 'empty',
    size: 's',
    isDisabled: false,
    withIcon: true,
    icon: 'aiAssistantLogo',
  },
};

export const Icon: StoryObj<IconComponentStoryArgs> = {
  argTypes: {
    label: { name: 'aria-label' },
    iconOnly: { control: false },
    icon: {
      control: 'select',
      options: ICON_ONLY_ICON_OPTIONS,
    },
  },
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
