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
import { mockDataSources } from './mocks';

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

const InteractiveWrapper = ({ selectedSources = [] }: { selectedSources?: string[] }) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <DataSourceBrowser
      isOpen={isOpen}
      isLoading={false}
      onClose={() => {
        setIsOpen(false);
        action('onClose')();
      }}
      onSelect={(sources) => {
        action('onSelect')(sources);
      }}
      allSources={mockDataSources}
      selectedSources={selectedSources}
      position={{ top: 100, left: 100 }}
    />
  );
};

export const Default: Story = {
  render: () => <InteractiveWrapper />,
};

export const WithInitialSelection: Story = {
  render: () => <InteractiveWrapper selectedSources={['logs-*', 'kibana_sample_data_logs']} />,
};
