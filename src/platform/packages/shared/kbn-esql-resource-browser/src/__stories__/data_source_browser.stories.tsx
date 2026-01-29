/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { DataSourceBrowser } from '../data_source_browser';
import { createMockCore, mockGetLicense } from './mocks';

const meta: Meta<typeof DataSourceBrowser> = {
  title: 'ES|QL Resource Browser/Data Source Browser',
  component: DataSourceBrowser,
  parameters: {
    backgrounds: {
      default: 'white',
      values: [{ name: 'white', value: '#fff' }],
    },
  },
};

export default meta;
type Story = StoryObj<typeof DataSourceBrowser>;

const InteractiveWrapper = ({
  isTSCommand = false,
  initialSources = [],
}: {
  isTSCommand?: boolean;
  initialSources?: string[];
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const core = createMockCore();

  return (
      <DataSourceBrowser
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
          action('onClose')();
        }}
        onSelect={(sources) => {
          action('onSelect')(sources);
        }}
        core={core}
        getLicense={mockGetLicense}
        isTSCommand={isTSCommand}
        initialSources={initialSources}
        position={{ top: 100, left: 100 }}
      />
  );
};

export const Default: Story = {
  render: () => <InteractiveWrapper />,
};

export const WithInitialSelection: Story = {
  render: () => (
    <InteractiveWrapper initialSources={['logs-*', 'kibana_sample_data_logs']} />
  ),
};
