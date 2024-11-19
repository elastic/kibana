/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type Observable, map } from 'rxjs';
import type { AnalyticsServiceSetup } from '@kbn/core-analytics-browser';

/**
 * Registers the Analytics context provider to enrich events with the page title.
 * @param analytics Analytics service.
 * @param pageTitle$ Observable emitting the page title.
 * @private
 */
export function registerAnalyticsContextProvider(
  analytics: AnalyticsServiceSetup,
  pageTitle$: Observable<string>
) {
  analytics.registerContextProvider({
    name: 'page title',
    context$: pageTitle$.pipe(
      map((pageTitle) => ({
        page_title: pageTitle,
      }))
    ),
    schema: {
      page_title: { type: 'text', _meta: { description: 'The page title' } },
    },
  });
}
