/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Locator, ScoutPage } from '@kbn/scout';

export interface WaterfallItem {
  readonly row: Locator;
  readonly content: Locator;
  readonly errorBadge: Locator;
  readonly serviceBadge: Locator;
}

export interface Waterfall {
  readonly container: Locator;
  readonly sizeWarning: Locator;
  readonly sizeWarningDiscoverLink: Locator;
  getItem(name: string): WaterfallItem;
}

export function getWaterfallItem(scope: Locator, name: string): WaterfallItem {
  const row = scope.locator('[data-test-subj="traceItemRowWrapper"]').filter({ hasText: name });
  return {
    row,
    content: row.locator('[data-test-subj="apmBarDetailsName"]'),
    errorBadge: row.locator('[data-test-subj="apmBarDetailsErrorBadge"]'),
    serviceBadge: row.locator('[data-test-subj="apmBarDetailsServiceNameBadge"]'),
  };
}

export function createWaterfall(page: ScoutPage): Waterfall {
  const container = page.testSubj.locator('waterfallContainer');
  return {
    container,
    sizeWarning: page.testSubj.locator('waterfallSizeWarning'),
    sizeWarningDiscoverLink: page.testSubj.locator('waterfallSizeWarningDiscoverLink'),
    getItem(name: string): WaterfallItem {
      return getWaterfallItem(container, name);
    },
  };
}
