/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useContext } from 'react';
import { Services } from './types';

export const SubscriptionTrackingContext = React.createContext<Services | null>(null);

/**
 * External services provider
 */
export const SubscriptionTrackingProvider: FC<Services> = ({ children, ...services }) => {
  return (
    <SubscriptionTrackingContext.Provider value={services}>
      {children}
    </SubscriptionTrackingContext.Provider>
  );
};

/**
 * React hook for accessing pre-wired services.
 */
export function useServices() {
  const context = useContext(SubscriptionTrackingContext);

  if (!context) {
    throw new Error(
      'SubscriptionTrackingContext is missing. Ensure your component or React root is wrapped with SubscriptionTrackingProvider.'
    );
  }

  return context;
}
