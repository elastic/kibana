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
import type { AiButtonIconType, AiButtonVariant } from './types';

const ICON_OPTIONS: AiButtonIconType[] = [
  'aiAssistantLogo',
  'sparkles',
  'productAgent',
  'addToChat',
];

interface CommonStoryArgs {
  label: string;
  isDisabled: boolean;
  icon: AiButtonIconType;
  size: EuiButtonEmptySizes;
  withIcon: boolean;
}

interface StoryArgs extends CommonStoryArgs {
  iconOnly: boolean;
  withToolTip: boolean;
  toolTipContent: string;
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

interface IconComponentStoryArgs extends Omit<CommonStoryArgs, 'withIcon'> {
  variant: AiButtonVariant;
  iconSize?: EuiButtonSize;
  iconOnly: true;
  withToolTip: boolean;
  toolTipContent: string;
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
    icon: {
      control: 'select',
      options: ICON_OPTIONS,
    },
  },
} as Meta<StoryArgs>;

export const Default: StoryObj<StoryArgs> = {
  argTypes: {
    withIcon: {
      if: { arg: 'iconOnly', truthy: false },
    },
    withToolTip: {
      if: { arg: 'iconOnly' },
    },
    toolTipContent: {
      if: { arg: 'withToolTip' },
    },
  },
  render: ({
    label,
    variant,
    size,
    isDisabled,
    withIcon,
    iconOnly,
    withToolTip,
    toolTipContent,
    icon,
  }) => {
    if (iconOnly) {
      return (
        <AiButton
          iconOnly
          variant={variant}
          size={size}
          isDisabled={isDisabled}
          iconType={icon}
          aria-label={label}
          {...(withToolTip
            ? { withToolTip: true, ...(toolTipContent ? { toolTipContent } : {}) }
            : {})}
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
    withToolTip: false,
    toolTipContent: '',
    icon: 'aiAssistantLogo',
  },
};

export const BaseOrAccent: StoryObj<ButtonComponentStoryArgs> = {
  argTypes: {
    variant: { control: 'select', options: ['base', 'accent'] },
    iconOnly: { control: false },
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
    withToolTip: { control: 'boolean' },
    toolTipContent: {
      control: 'text',
      if: { arg: 'withToolTip' },
    },
  },
  render: ({ label, size, isDisabled, variant, icon, withToolTip, toolTipContent }) => (
    <AiButtonIcon
      size={size}
      isDisabled={isDisabled}
      variant={variant}
      iconType={icon}
      aria-label={label}
      {...(withToolTip ? { withToolTip: true, ...(toolTipContent ? { toolTipContent } : {}) } : {})}
    />
  ),
  args: {
    label: 'AI Assistant',
    size: 's',
    isDisabled: false,
    variant: 'base',
    icon: 'aiAssistantLogo',
    withToolTip: false,
    toolTipContent: '',
  },
};
