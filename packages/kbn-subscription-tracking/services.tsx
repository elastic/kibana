/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useContext } from 'react';
import { AnalyticsClient, EventTypeOpts } from '@kbn/analytics-client';
import { EVENT_NAMES, Services, SubscriptionContext } from './types';

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

const subscriptionContextSchema: EventTypeOpts<SubscriptionContext>['schema'] = {
  source: {
    type: 'keyword',
    _meta: {
      description:
        'A human-readable identifier describing the location of the beginning of the subscription flow',
    },
  },
  feature: {
    type: 'keyword',
    _meta: {
      description: 'A human-readable identifier describing the feature that is being promoted',
    },
  },
};

/**
 * Registers the subscription-specific event types
 */
export function registerEvents(analyticsClient: Pick<AnalyticsClient, 'registerEventType'>) {
  analyticsClient.registerEventType<SubscriptionContext>({
    eventType: EVENT_NAMES.IMPRESSION,
    schema: subscriptionContextSchema,
  });

  analyticsClient.registerEventType<SubscriptionContext>({
    eventType: EVENT_NAMES.CLICK,
    schema: subscriptionContextSchema,
  });
}
