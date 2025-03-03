/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AnalyticsServiceSetup } from '@kbn/core-analytics-browser';
import { type Observable, map } from 'rxjs';

export function registerAnalyticsContextProvider({
  analytics,
  location$,
}: {
  analytics: AnalyticsServiceSetup;
  location$: Observable<string>;
}) {
  analytics.registerContextProvider({
    name: 'page url',
    context$: location$.pipe(map((location) => ({ page_url: location }))),
    schema: {
      page_url: { type: 'text', _meta: { description: 'The page url' } },
    },
  });
}
