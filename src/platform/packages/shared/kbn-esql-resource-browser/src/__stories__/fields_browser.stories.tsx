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
import type { ESQLFieldWithMetadata, RecommendedField } from '@kbn/esql-types';
import { FieldsBrowser } from '../fields_browser';

const mockFields: ESQLFieldWithMetadata[] = [
  { name: '@timestamp', type: 'date', userDefined: false },
  { name: 'message', type: 'text', userDefined: false },
  { name: 'host.name', type: 'keyword', userDefined: false },
  { name: 'host.ip', type: 'ip', userDefined: false },
  { name: 'bytes', type: 'long', userDefined: false },
  { name: 'response_time', type: 'double', userDefined: false },
  { name: 'geo.location', type: 'geo_point', userDefined: false },
  { name: 'status_code', type: 'integer', userDefined: false },
  { name: 'user.name', type: 'keyword', userDefined: false },
  { name: 'tags', type: 'keyword', userDefined: false },
];

const mockRecommendedFields: RecommendedField[] = [
  { name: '@timestamp', pattern: 'logs-*' },
  { name: 'message', pattern: 'logs-*' },
  { name: 'host.name', pattern: 'logs-*' },
  { name: 'bytes', pattern: 'logs-*' },
];

const meta: Meta<typeof FieldsBrowser> = {
  title: 'ES|QL Resource Browser/Fields Browser',
  component: FieldsBrowser,
  parameters: {
    backgrounds: {
      default: 'white',
      values: [{ name: 'white', value: '#fff' }],
    },
  },
};

export default meta;
type Story = StoryObj<typeof FieldsBrowser>;

const InteractiveWrapper = ({
  isLoading = false,
  recommendedFields = [],
}: {
  isLoading?: boolean;
  recommendedFields?: RecommendedField[];
}) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <FieldsBrowser
      isOpen={isOpen}
      isLoading={isLoading}
      onClose={() => {
        setIsOpen(false);
        action('onClose')();
      }}
      onSelect={(fieldName, change) => {
        action('onSelect')(fieldName, change);
      }}
      allFields={mockFields}
      recommendedFields={recommendedFields}
      position={{ top: 100, left: 100 }}
    />
  );
};

export const Default: Story = {
  render: () => <InteractiveWrapper />,
};

export const WithRecommendedFields: Story = {
  render: () => <InteractiveWrapper recommendedFields={mockRecommendedFields} />,
};
