/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { Title, Subtitle, Description, Primary, Stories } from '@storybook/blocks';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import type { Decorator } from '@storybook/react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

export const decorators: Decorator[] = [
  (Story) => (
    <QueryClientProvider client={queryClient}>
      <Story />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  ),
];

export const parameters = {
  docs: {
    page: () => {
      <>
        <Title />
        <Subtitle />
        <Description />
        <Primary />
        <QueryClientProvider client={queryClient}>
          <Stories />
        </QueryClientProvider>
      </>;
    },
  },
};
