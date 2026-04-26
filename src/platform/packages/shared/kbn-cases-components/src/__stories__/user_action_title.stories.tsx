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
import { UserActionTitle } from '../user_action_title';

const meta: Meta<typeof UserActionTitle> = {
  title: 'UserActionTitle',
  component: UserActionTitle,
  decorators: [
    (Story) => (
      <I18nProvider>
        <Story />
      </I18nProvider>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof UserActionTitle>;

export const Default: Story = {
  args: {
    label: 'added an alert from',
    link: {
      targetId: 'rule-id-1',
      label: 'My Rule',
      getHref: () => '#',
    },
    dataTestSubj: 'default',
  },
};

export const WithoutLink: Story = {
  args: {
    dataTestSubj: 'without-link',
    label: 'added an alert',
  },
};

export const LoadingLink: Story = {
  args: {
    dataTestSubj: 'loading-link',
    label: 'added an alert from',
    link: {
      targetId: 'rule-id-1',
      label: 'My Rule',
      isLoading: true,
    },
  },
};
