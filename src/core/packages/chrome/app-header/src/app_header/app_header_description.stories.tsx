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
import { EuiPageTemplate, EuiTitle } from '@elastic/eui';
import type { AppHeaderDescription as AppHeaderDescriptionConfig } from '../types';
import { AppHeaderDescription } from './app_header_description';
import { AppHeaderShell } from './app_header_shell';

interface AppHeaderDescriptionStoryProps {
  title: string;
  description: AppHeaderDescriptionConfig;
}

const HeaderWithDescription = ({ title, description }: AppHeaderDescriptionStoryProps) => (
  <AppHeaderShell
    title={
      <EuiTitle size="s">
        <h1>{title}</h1>
      </EuiTitle>
    }
    secondaryContent={<AppHeaderDescription description={description} />}
    sticky={false}
  />
);

const meta: Meta<AppHeaderDescriptionStoryProps> = {
  title: 'Chrome/App Header Description',
  component: HeaderWithDescription,
  decorators: [
    (Story) => (
      <EuiPageTemplate>
        <Story />
      </EuiPageTemplate>
    ),
  ],
};

export default meta;

type Story = StoryObj<AppHeaderDescriptionStoryProps>;

export const Description: Story = {
  args: {
    title: 'Data federation',
    description: 'Query and analyze data stored across multiple Elasticsearch clusters.',
  },
};

export const DescriptionWithLearnMore: Story = {
  name: 'Description with Learn more',
  args: {
    title: 'Data federation',
    description: {
      text: 'Query and analyze data stored across multiple Elasticsearch clusters.',
      learnMoreUrl: 'https://www.elastic.co/docs',
    },
  },
};
