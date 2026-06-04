/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  AnalyticsServiceStart,
  CoreStart,
  I18nStart,
  ThemeServiceStart,
  UserProfileService,
} from '@kbn/core/public';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import {
  SUBMIT_ORDER_ROUTE_PATH,
  BREW_BATCH_ROUTE_PATH,
  type OrderRequest,
  type OrderResult,
  type BatchSummary,
} from '../common';

interface StartServices {
  analytics: Pick<AnalyticsServiceStart, 'reportEvent'>;
  i18n: I18nStart;
  theme: Pick<ThemeServiceStart, 'theme$'>;
  userProfile: UserProfileService;
}

export interface Services {
  startServices: StartServices;
  submitOrder: (order: OrderRequest) => Promise<OrderResult | IHttpFetchError>;
  brewBatch: (count: number) => Promise<BatchSummary | IHttpFetchError>;
}

export function getServices(core: CoreStart): Services {
  const { analytics, i18n, theme, userProfile } = core;
  const startServices = { analytics, i18n, theme, userProfile };

  return {
    startServices,
    submitOrder: async (order: OrderRequest) => {
      try {
        return await core.http.post<OrderResult>(SUBMIT_ORDER_ROUTE_PATH, {
          body: JSON.stringify(order),
        });
      } catch (e) {
        return e;
      }
    },
    brewBatch: async (count: number) => {
      try {
        return await core.http.post<BatchSummary>(BREW_BATCH_ROUTE_PATH, {
          body: JSON.stringify({ count }),
        });
      } catch (e) {
        return e;
      }
    },
  };
}
