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
import type { ESQLFieldWithMetadata } from '@kbn/esql-types';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
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

const InteractiveWrapper = () => {
  const [isOpen, setIsOpen] = useState(true);
  const services = {
    core: {
      // Not used by this story (we preload fields + do not pass activeSolutionId),
      // but required by `useKibana`.
      http: {} as any,
    },
    data: {
      // Not used by this story (we preload fields), but required by `useKibana`.
      search: { search: {} as any },
      query: { timefilter: { timefilter: { getTime: () => ({ from: 'now-15m', to: 'now' }) } } },
    },
  };

  return (
    <KibanaContextProvider services={services as any}>
      <FieldsBrowser
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
          action('onClose')();
        }}
        onSelect={(fieldName, change) => {
          action('onSelect')(fieldName, change);
        }}
        preloadedFields={mockFields.map((f) => ({ name: f.name, type: f.type }))}
        indexPattern="index1,index2"
        fullQuery="FROM index1, index2"
        position={{ top: 100, left: 100 }}
      />
    </KibanaContextProvider>
  );
};

export const Default: Story = {
  render: () => <InteractiveWrapper />,
};
