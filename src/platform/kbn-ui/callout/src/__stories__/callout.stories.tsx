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
import { action } from '@storybook/addon-actions';

import { KbnInfoCallout } from '../info_callout';
import { KbnSuccessCallout } from '../success_callout';
import { KbnWarningCallout } from '../warning_callout';
import { KbnDangerCallout } from '../danger_callout';
import { type KbnCalloutProps } from '../types';

type StoryArgs = Omit<KbnCalloutProps, 'onDismiss'> & {
  onDismiss: boolean;
};

const actionProps = {
  primary: {
    children: 'Primary action',
    onClick: action('Primary action clicked'),
  },
  secondary: {
    children: 'Secondary action',
    onClick: action('Secondary action clicked'),
  },
};

const buildProps = ({ onDismiss, ...rest }: StoryArgs) => ({
  onDismiss: onDismiss ? action('onDismiss') : undefined,
  ...rest,
});

export default {
  title: 'Display/Callout',
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    size: { control: 'radio', options: ['s', 'm'] },
    onDismiss: { control: 'boolean' },
  },
  args: {
    actionProps: {},
    dismissButtonProps: {},
    onDismiss: false,
    size: 'm',
  },
} as Meta;
type Story = StoryObj<StoryArgs>;

export const Info: Story = {
  name: 'InfoCallout',
  args: {
    title: 'Did you know?',
    text: 'This is an informational callout. Use it for neutral guidance, tips, or notes.',
  },
  render: (args) => <KbnInfoCallout {...buildProps(args)} />,
};

export const InfoWithActions: Story = {
  name: 'InfoCallout with actions',
  args: {
    title: 'Did you know?',
    text: 'This is an informational callout. Use it for neutral guidance, tips, or notes.',
    actionProps,
  },
  render: (args) => <KbnInfoCallout {...buildProps(args)} />,
};

export const Success: Story = {
  name: 'SuccessCallout',
  args: {
    title: 'Changes saved',
    text: 'Your changes have been saved successfully.',
  },
  render: (args) => <KbnSuccessCallout {...buildProps(args)} />,
};

export const SuccessWithActions: Story = {
  name: 'SuccessCallout with actions',
  args: {
    title: 'Changes saved',
    text: 'Your changes have been saved successfully.',
    actionProps,
  },
  render: (args) => <KbnSuccessCallout {...buildProps(args)} />,
};

export const Warning: Story = {
  name: 'WarningCallout',
  args: {
    title: 'Proceed with caution',
    text: 'This action may have unintended side effects. Review before continuing.',
  },
  render: (args) => <KbnWarningCallout {...buildProps(args)} />,
};

export const WarningWithActions: Story = {
  name: 'WarningCallout with actions',
  args: {
    title: 'Proceed with caution',
    text: 'This action may have unintended side effects. Review before continuing.',
    actionProps,
  },
  render: (args) => <KbnWarningCallout {...buildProps(args)} />,
};

export const Danger: Story = {
  name: 'DangerCallout',
  args: {
    title: 'Something went wrong',
    text: 'An error occurred while processing your request. Please try again.',
  },
  render: (args) => <KbnDangerCallout {...buildProps(args)} />,
};

export const DangerWithActions: Story = {
  name: 'DangerCallout with actions',
  args: {
    title: 'Something went wrong',
    text: 'An error occurred while processing your request. Please try again.',
    actionProps,
  },
  render: (args) => <KbnDangerCallout {...buildProps(args)} />,
};
