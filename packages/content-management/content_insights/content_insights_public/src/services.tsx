/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FC, PropsWithChildren, useContext } from 'react';
import React from 'react';

import { ContentInsightsClientPublic } from './client';

/**
 * Abstract external services for this component.
 */
export interface ContentInsightsServices {
  contentInsightsClient: ContentInsightsClientPublic;
}

const ContentInsightsContext = React.createContext<ContentInsightsServices | null>(null);

/**
 * Abstract external service Provider.
 */
export const ContentInsightsProvider: FC<PropsWithChildren<Partial<ContentInsightsServices>>> = ({
  children,
  ...services
}) => {
  if (!services.contentInsightsClient) {
    return <>{children}</>;
  }

  return (
    <ContentInsightsContext.Provider
      value={{ contentInsightsClient: services.contentInsightsClient }}
    >
      {children}
    </ContentInsightsContext.Provider>
  );
};

/*
 * React hook for accessing pre-wired services.
 */
export function useServices() {
  const context = useContext(ContentInsightsContext);
  return context;
}
