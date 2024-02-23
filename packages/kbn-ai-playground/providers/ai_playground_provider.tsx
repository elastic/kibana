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
import { ChatProvider } from '@kbn/ai-playground/providers/chat_provider';

interface AIPlaygroundProviderProps {
  navigateToIndexPage: () => void;
  children: ReactNode;
}

const queryClient = new QueryClient({});

export const AIPlaygroundProvider: React.FC<AIPlaygroundProviderProps> = ({
  navigateToIndexPage,
  children,
}) => {
  const form = useForm<ChatForm>();

  return (
    <ChatProvider navigateToIndexPage={navigateToIndexPage}>
      <QueryClientProvider client={queryClient}>
        <FormProvider {...form}>{children}</FormProvider>
      </QueryClientProvider>
    </ChatProvider>
  );
};
