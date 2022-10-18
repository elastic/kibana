/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useEffect, useRef } from 'react';
import { isValidContext } from './helpers';
import { useServices } from './services';
import { EVENT_NAMES, SubscriptionContext } from './types';

export const useImpression = (context: SubscriptionContext) => {
  const { analyticsClient } = useServices();
  const hasSentImpression = useRef(false);

  useEffect(() => {
    if (!hasSentImpression.current) {
      if (isValidContext(context)) {
        analyticsClient.reportEvent(EVENT_NAMES.IMPRESSION, context);
      } else {
        // eslint-disable-next-line no-console
        console.error('The provided subscription context is invalid', context);
      }

      hasSentImpression.current = true;
    }
  }, [analyticsClient, context]);
};
