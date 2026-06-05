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

import { InfoCallout } from '../info_callout';
import { SuccessCallout } from '../success_callout';
import { WarningCallout } from '../warning_callout';
import { ErrorCallout } from '../error_callout';
import { type CalloutProps } from '../types';

type StoryArgs = Omit<CalloutProps, 'onDismiss'> & {
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
  render: (args) => <InfoCallout {...buildProps(args)} />,
};

export const InfoWithActions: Story = {
  name: 'InfoCallout with actions',
  args: {
    title: 'Did you know?',
    text: 'This is an informational callout. Use it for neutral guidance, tips, or notes.',
    actionProps,
  },
  render: (args) => <InfoCallout {...buildProps(args)} />,
};

export const Success: Story = {
  name: 'SuccessCallout',
  args: {
    title: 'Changes saved',
    text: 'Your changes have been saved successfully.',
  },
  render: (args) => <SuccessCallout {...buildProps(args)} />,
};

export const SuccessWithActions: Story = {
  name: 'SuccessCallout with actions',
  args: {
    title: 'Changes saved',
    text: 'Your changes have been saved successfully.',
    actionProps,
  },
  render: (args) => <SuccessCallout {...buildProps(args)} />,
};

export const Warning: Story = {
  name: 'WarningCallout',
  args: {
    title: 'Proceed with caution',
    text: 'This action may have unintended side effects. Review before continuing.',
  },
  render: (args) => <WarningCallout {...buildProps(args)} />,
};

export const WarningWithActions: Story = {
  name: 'WarningCallout with actions',
  args: {
    title: 'Proceed with caution',
    text: 'This action may have unintended side effects. Review before continuing.',
    actionProps,
  },
  render: (args) => <WarningCallout {...buildProps(args)} />,
};

export const Error: Story = {
  name: 'ErrorCallout',
  args: {
    title: 'Something went wrong',
    text: 'An error occurred while processing your request. Please try again.',
  },
  render: (args) => <ErrorCallout {...buildProps(args)} />,
};

export const ErrorWithActions: Story = {
  name: 'ErrorCallout with actions',
  args: {
    title: 'Something went wrong',
    text: 'An error occurred while processing your request. Please try again.',
    actionProps,
  },
  render: (args) => <ErrorCallout {...buildProps(args)} />,
};
