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
import { css } from '@emotion/react';
import { EuiPageTemplate, EuiTitle } from '@elastic/eui';
import type { AppHeaderMetadataItems } from '../types';
import { AppHeaderMetadata } from './app_header_metadata';
import { AppHeaderShell } from './app_header_shell';

interface AppHeaderMetadataStoryProps {
  title: string;
  metadata: AppHeaderMetadataItems;
  width?: number;
}

const HeaderWithMetadata = ({ title, metadata, width }: AppHeaderMetadataStoryProps) => {
  return (
    <div
      css={css`
        width: ${width ? `${width}px` : '100%'};
      `}
    >
      <AppHeaderShell
        title={
          <EuiTitle size="xs">
            <h1>{title}</h1>
          </EuiTitle>
        }
        metadata={<AppHeaderMetadata metadata={metadata} />}
        padding="m"
        sticky={false}
      />
    </div>
  );
};

const meta: Meta<AppHeaderMetadataStoryProps> = {
  title: 'Chrome/App Header Metadata',
  component: HeaderWithMetadata,
  decorators: [
    (Story) => (
      <EuiPageTemplate>
        <Story />
      </EuiPageTemplate>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Metadata displayed below the page title in the Chrome app header. ' +
          'Metadata supports up to three visible items with no overflow menu.',
      },
    },
  },
};

export default meta;

type Story = StoryObj<AppHeaderMetadataStoryProps>;

export const Metadata: Story = {
  args: {
    title: 'System Shells via Services',
    metadata: [
      { type: 'health', label: 'Warning at llm 24', color: 'warning' },
      { type: 'text', label: 'Created by: analyst on Oct 10, 2024 @ 00:11:03.176' },
      {
        type: 'button',
        label: 'Updated by: analyst on Feb 8, 2026 @ 04:37:53.533',
        onClick: action('updated-by-clicked'),
      },
    ],
  },
};

export const WrappedMetadata: Story = {
  name: 'Wrapped metadata',
  args: {
    ...Metadata.args,
    width: 520,
  },
};
