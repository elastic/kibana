/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import type { ContentClient } from './content_client';

const ContentClientContext = React.createContext<ContentClient>(null as unknown as ContentClient);

export const useContentClient = (): ContentClient => {
  const contentClient = React.useContext(ContentClientContext);
  if (!contentClient) throw new Error('contentClient not found');
  return contentClient;
};

export const ContentClientProvider: React.FC<{ contentClient: ContentClient }> = ({
  contentClient,
  children,
}) => {
  return (
    <ContentClientContext.Provider value={contentClient}>
      <QueryClientProvider client={contentClient.queryClient}>{children}</QueryClientProvider>
    </ContentClientContext.Provider>
  );
};
