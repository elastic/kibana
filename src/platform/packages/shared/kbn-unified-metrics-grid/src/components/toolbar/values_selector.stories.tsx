/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import type { MetricsExperienceClient } from '@kbn/metrics-experience-plugin/public';
import { ValuesSelector } from './values_selector';
import { MetricsExperienceClientProvider } from '../../context/metrics_experience_client_provider';
import { FIELD_VALUE_SEPARATOR } from '../../common/constants';

export default {
  title: 'kbn-unified-metrics-grid/ValuesSelector',
  component: ValuesSelector,
};

const defaultTimeRange = {
  from: 'now-15m',
  to: 'now',
};

// Create a QueryClient instance for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

// Mock client for Storybook
const mockClient: MetricsExperienceClient = {
  getDimensions: async () => ({
    values: [
      { field: 'host.name', value: 'server-01' },
      { field: 'host.name', value: 'server-02' },
      { field: 'host.name', value: 'server-03' },
      { field: 'service.name', value: 'api-service' },
      { field: 'service.name', value: 'web-service' },
      { field: 'service.name', value: 'database-service' },
    ],
  }),
  getFields: async () => ({ fields: [], total: 0, page: 1 }),
  searchFields: async () => ({ fields: [], total: 0, page: 1 }),
};

// Wrapper component with all required providers
const StoryWrapper = ({ children }: React.PropsWithChildren<{}>) => (
  <IntlProvider locale="en">
    <QueryClientProvider client={queryClient}>
      <MetricsExperienceClientProvider value={{ client: mockClient }}>
        {children}
      </MetricsExperienceClientProvider>
    </QueryClientProvider>
  </IntlProvider>
);

export const Default = () => {
  const [selectedValues, setSelectedValues] = useState<string[]>([]);

  return (
    <StoryWrapper>
      <ValuesSelector
        selectedDimensions={[
          { name: 'host.name', type: 'keyword' },
          { name: 'service.name', type: 'keyword' },
        ]}
        selectedValues={selectedValues}
        indices={['metrics-*']}
        timeRange={defaultTimeRange}
        onChange={setSelectedValues}
        onClear={() => setSelectedValues([])}
      />
    </StoryWrapper>
  );
};

export const WithSelectedValues = () => {
  const [selectedValues, setSelectedValues] = useState<string[]>([
    `host.name${FIELD_VALUE_SEPARATOR}server-01`,
    `service.name${FIELD_VALUE_SEPARATOR}api-service`,
  ]);

  return (
    <StoryWrapper>
      <ValuesSelector
        selectedDimensions={[
          { name: 'host.name', type: 'keyword' },
          { name: 'service.name', type: 'keyword' },
        ]}
        selectedValues={selectedValues}
        indices={['metrics-*']}
        timeRange={defaultTimeRange}
        onChange={setSelectedValues}
        onClear={() => setSelectedValues([])}
      />
    </StoryWrapper>
  );
};

export const Disabled = () => {
  const [selectedValues, setSelectedValues] = useState<string[]>([]);

  return (
    <StoryWrapper>
      <ValuesSelector
        selectedDimensions={[{ name: 'host.name', type: 'keyword' }]}
        selectedValues={selectedValues}
        indices={['metrics-*']}
        disabled={true}
        timeRange={defaultTimeRange}
        onChange={setSelectedValues}
        onClear={() => setSelectedValues([])}
      />
    </StoryWrapper>
  );
};

export const NoDimensionsLoadingState = () => {
  const [selectedValues, setSelectedValues] = useState<string[]>([]);

  return (
    <StoryWrapper>
      <ValuesSelector
        selectedDimensions={[]}
        selectedValues={selectedValues}
        indices={['metrics-*']}
        timeRange={defaultTimeRange}
        onChange={setSelectedValues}
        onClear={() => setSelectedValues([])}
      />
    </StoryWrapper>
  );
};
