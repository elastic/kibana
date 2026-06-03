/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Meta, StoryObj } from '@storybook/react';

import { AiIcon } from './ai_icon';

const meta = {
  title: 'AI components/AiIcon',
  component: AiIcon,
  parameters: {
    controls: { include: ['iconType', 'size'] },
  },
  argTypes: {
    iconType: {
      control: 'select',
      options: ['aiAssistantLogo', 'sparkles', 'productAgent'],
    },
    size: {
      control: 'select',
      options: ['original', 's', 'm', 'l', 'xl', 'xxl'],
    },
  },
} satisfies Meta<typeof AiIcon>;

export default meta;

export const Default: StoryObj<typeof meta> = {
  args: {
    iconType: 'sparkles',
    size: 'xl',
  },
};
