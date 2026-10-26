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
import { I18nProvider } from '@kbn/i18n-react';
import { UserActionTitleLink } from '../user_action_title_link';

const meta: Meta<typeof UserActionTitleLink> = {
  title: 'UserActionTitleLink',
  component: UserActionTitleLink,
  decorators: [
    (Story) => (
      <I18nProvider>
        <Story />
      </I18nProvider>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof UserActionTitleLink>;

export const Default: Story = {
  args: {
    dataTestSubj: 'default-link',
    targetId: 'rule-id-1',
    label: 'My Rule',
    getHref: () => '#',
  },
};

export const WithClickHandlerOnly: Story = {
  args: {
    dataTestSubj: 'click-only',
    targetId: 'rule-id-1',
    label: 'My Rule',
    onClick: () => {},
  },
};

export const FallbackLabel: Story = {
  args: {
    dataTestSubj: 'fallback',
    targetId: 'rule-id-1',
    label: null,
    fallbackLabel: 'Unknown rule',
    getHref: () => '#',
  },
};

export const Loading: Story = {
  args: {
    dataTestSubj: 'loading',
    targetId: 'rule-id-1',
    label: 'My Rule',
    isLoading: true,
  },
};
