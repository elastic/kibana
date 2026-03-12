/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { SplitButtonWithNotification } from './split_button_with_notification';
import { SplitButton } from './split_button';

const DEFAULT_SECONDARY_ICON = 'clock';

export default {
  title: 'Split Button',
};

export const Default = {
  name: 'Default',
  args: {
    secondaryButtonIcon: DEFAULT_SECONDARY_ICON,
  },
  render: (args: { secondaryButtonIcon: string }) => <SplitButton {...args}>Default</SplitButton>,
};

export const BothIcons = {
  name: 'Both icons',
  args: {
    secondaryButtonIcon: DEFAULT_SECONDARY_ICON,
    iconType: 'search',
  },
  render: (args: { secondaryButtonIcon: string; iconType: string }) => (
    <SplitButton {...args}>Both icons</SplitButton>
  ),
};

export const TextColor = {
  name: 'Text color',
  args: {
    color: 'text',
  },
  render: (args: { color: React.ComponentProps<typeof SplitButton>['color'] }) => (
    <SplitButton secondaryButtonIcon={DEFAULT_SECONDARY_ICON} {...args}>
      Default
    </SplitButton>
  ),
};

export const AccentColor = {
  name: 'Accent color',
  args: {
    color: 'accent',
  },
  render: (args: { color: React.ComponentProps<typeof SplitButton>['color'] }) => (
    <SplitButton secondaryButtonIcon={DEFAULT_SECONDARY_ICON} {...args}>
      Default
    </SplitButton>
  ),
};

export const DangerColor = {
  name: 'Danger color',
  args: {
    color: 'danger',
  },
  render: (args: { color: React.ComponentProps<typeof SplitButton>['color'] }) => (
    <SplitButton secondaryButtonIcon={DEFAULT_SECONDARY_ICON} {...args}>
      Default
    </SplitButton>
  ),
};

export const SuccessColor = {
  name: 'Success color',
  args: {
    color: 'success',
  },
  render: (args: { color: React.ComponentProps<typeof SplitButton>['color'] }) => (
    <SplitButton secondaryButtonIcon={DEFAULT_SECONDARY_ICON} {...args}>
      Default
    </SplitButton>
  ),
};

export const WarningColor = {
  name: 'Warning color',
  args: {
    color: 'warning',
  },
  render: (args: { color: React.ComponentProps<typeof SplitButton>['color'] }) => (
    <SplitButton secondaryButtonIcon={DEFAULT_SECONDARY_ICON} {...args}>
      Default
    </SplitButton>
  ),
};

export const MediumSize = {
  name: 'Medium size',
  args: {
    size: 'm',
  },
  render: (args: { size: React.ComponentProps<typeof SplitButton>['size'] }) => (
    <SplitButton secondaryButtonIcon={DEFAULT_SECONDARY_ICON} {...args}>
      Medium size
    </SplitButton>
  ),
};

export const SmallSize = {
  name: 'Small size',
  args: {
    size: 's',
  },
  render: (args: { size: React.ComponentProps<typeof SplitButton>['size'] }) => (
    <SplitButton secondaryButtonIcon={DEFAULT_SECONDARY_ICON} {...args}>
      Small size
    </SplitButton>
  ),
};

export const Disabled = {
  name: 'Disabled',
  args: {
    isDisabled: true,
    disabled: true,
  },
  render: (args: { isDisabled: boolean; disabled: boolean }) => (
    <SplitButton secondaryButtonIcon={DEFAULT_SECONDARY_ICON} {...args}>
      Small size
    </SplitButton>
  ),
};

export const AllLoading = {
  name: 'All loading',
  args: {
    isLoading: true,
    isMainButtonLoading: true,
    isSecondaryButtonLoading: true,
  },
  render: (args: {
    isLoading: boolean;
    isMainButtonLoading: boolean;
    isSecondaryButtonLoading: boolean;
  }) => (
    <SplitButton secondaryButtonIcon={DEFAULT_SECONDARY_ICON} {...args}>
      Small size
    </SplitButton>
  ),
};

export const MainButtonLoading = {
  name: 'Main button loading',
  args: {
    isLoading: false,
    isMainButtonLoading: true,
    isSecondaryButtonLoading: false,
  },
  render: (args: {
    isLoading: boolean;
    isMainButtonLoading: boolean;
    isSecondaryButtonLoading: boolean;
  }) => (
    <SplitButton secondaryButtonIcon={DEFAULT_SECONDARY_ICON} {...args}>
      Small size
    </SplitButton>
  ),
};

export const SecondaryButtonLoading = {
  name: 'Secondary button loading',
  args: {
    isLoading: false,
    isMainButtonLoading: false,
    isSecondaryButtonLoading: true,
  },
  render: (args: {
    isLoading: boolean;
    isMainButtonLoading: boolean;
    isSecondaryButtonLoading: boolean;
  }) => (
    <SplitButton secondaryButtonIcon={DEFAULT_SECONDARY_ICON} {...args}>
      Small size
    </SplitButton>
  ),
};

export const WithNotificationIndicator = {
  name: 'With notification indicator',
  args: {
    showNotificationIndicator: true,
    notifcationIndicatorTooltipContent: 'You have unsaved changes',
    notificationIndicatorColor: 'primary',
    notificationIndicatorSize: 'm',
    notificationIndicatorPosition: {
      top: 2,
      left: 25,
    },
    size: 's',
    color: 'text',
    iconType: 'save',
  },
  render: (args: {
    showNotificationIndicator: boolean;
    notifcationIndicatorTooltipContent: string;
    notificationIndicatorColor: React.ComponentProps<
      typeof SplitButtonWithNotification
    >['notificationIndicatorColor'];
    notificationIndicatorSize: React.ComponentProps<
      typeof SplitButtonWithNotification
    >['notificationIndicatorSize'];
    notificationIndicatorPosition?: {
      top?: number;
      right?: number;
    };
    color: React.ComponentProps<typeof SplitButton>['color'];
    iconType: React.ComponentProps<typeof SplitButton>['iconType'];
    size: React.ComponentProps<typeof SplitButton>['size'];
  }) => (
    <SplitButtonWithNotification secondaryButtonIcon="arrowDown" {...args}>
      Save
    </SplitButtonWithNotification>
  ),
};
