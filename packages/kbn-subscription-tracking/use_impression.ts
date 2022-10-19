/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useEffect } from 'react';
import { isValidContext } from './helpers';
import { useServices } from './services';
import { EVENT_NAMES, SubscriptionContext } from './types';

/**
 * Sends an impression event with the given context.
 *
 * Note: impression events are throttled and will not fire more
 * often than once every 30 seconds.
 */
export const useImpression = (context: SubscriptionContext) => {
  const { analyticsClient } = useServices();

  useEffect(() => {
    if (!isValidContext(context)) {
      // eslint-disable-next-line no-console
      console.error('The provided subscription context is invalid', context);
      return;
    }
    if (!isCoolingDown(context)) {
      analyticsClient.reportEvent(EVENT_NAMES.IMPRESSION, context);
      coolDown(context);
    }
  }, [analyticsClient, context]);
};

/**
 * Impressions from the same context should not fire more than once every 30 seconds.
 * This prevents logging too many impressions in case a page is reloaded often or
 * if the user is navigating back and forth rapidly.
 */
export const coolDownTimeMs = 30 * 1000;
let impressionCooldown = new WeakMap<SubscriptionContext, number>();

function isCoolingDown(context: SubscriptionContext) {
  const previousLog = impressionCooldown.get(context);

  // we logged before and we are in the cooldown period
  return previousLog && Date.now() - previousLog < coolDownTimeMs;
}

function coolDown(context: SubscriptionContext) {
  impressionCooldown.set(context, Date.now());
}

export function resetCoolDown() {
  impressionCooldown = new WeakMap<SubscriptionContext, number>();
}
