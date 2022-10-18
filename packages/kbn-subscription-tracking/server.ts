/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AnalyticsClient, EventTypeOpts } from '@kbn/analytics-client';
import { EVENT_NAMES, SubscriptionContext } from './types';

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
export function registerEvents(analyticsClient: AnalyticsClient) {
  analyticsClient.registerEventType<SubscriptionContext>({
    eventType: EVENT_NAMES.IMPRESSION,
    schema: subscriptionContextSchema,
  });

  analyticsClient.registerEventType<SubscriptionContext>({
    eventType: EVENT_NAMES.CLICK,
    schema: subscriptionContextSchema,
  });
}
