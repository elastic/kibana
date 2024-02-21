/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FormProvider, useForm } from 'react-hook-form';
import { ChatForm } from '../types';

interface AIPlaygroundProviderProps {
  children: ReactNode;
}

const queryClient = new QueryClient({});

export const AIPlaygroundProvider: React.FC<AIPlaygroundProviderProps> = ({ children }) => {
  const form = useForm<ChatForm>();

  return (
    <>
      <QueryClientProvider client={queryClient}>
        <FormProvider {...form}>{children}</FormProvider>
      </QueryClientProvider>
    </>
  );
};
