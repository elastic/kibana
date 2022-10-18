/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { useCallback } from 'react';
import { isValidContext } from './helpers';
import { useServices } from './services';
import { EVENT_NAMES, SubscriptionContext } from './types';

interface Options {
  subscriptionContext: SubscriptionContext;
}

export const useGoToSubscription = ({ subscriptionContext }: Options) => {
  const { navigateToApp, analyticsClient } = useServices();
  const goToSubscription = useCallback(() => {
    if (isValidContext(subscriptionContext)) {
      analyticsClient.reportEvent(EVENT_NAMES.CLICK, subscriptionContext);
    } else {
      // eslint-disable-next-line no-console
      console.error('The provided subscription context is invalid', subscriptionContext);
    }
    navigateToApp('management', { path: 'stack/license_management' });
  }, [analyticsClient, navigateToApp, subscriptionContext]);

  return goToSubscription;
};
