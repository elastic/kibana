/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { PropsWithChildren } from 'react';
import { AlertsQueryContext } from '../contexts/alerts_query_context';
import { testQueryClientConfig } from './test_query_client_config';

const queryClient = new QueryClient(testQueryClientConfig);

export const Wrapper = ({ children }: PropsWithChildren) => {
  return (
    <QueryClientProvider client={queryClient} context={AlertsQueryContext}>
      {children}
    </QueryClientProvider>
  );
};
