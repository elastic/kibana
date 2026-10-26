/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Locator } from '@playwright/test';
import type { ScoutPage } from '../fixtures/scope/test/scout_page';

export type SelectorInput = string | { dataTestSubj: string } | { locator: string };

/**
 * Creates a Playwright locator based on the selector input type.
 * Supports:
 * - string: treated as 'dataTestSubj' for backward compatibility
 * - { dataTestSubj: string }: explicit data-test-subj selector
 * - { locator: string }: any valid Playwright locator (CSS, XPath, role, text, etc.)
 */
export function resolveSelector(page: ScoutPage, selector: SelectorInput): Locator {
  if (typeof selector === 'string') {
    // Backward compatibility: treat string as dataTestSubj
    // eslint-disable-next-line playwright/no-nth-methods
    return page.testSubj.locator(selector).first();
  } else if ('dataTestSubj' in selector) {
    // eslint-disable-next-line playwright/no-nth-methods
    return page.testSubj.locator(selector.dataTestSubj).first();
  } else if ('locator' in selector) {
    return page.locator(selector.locator);
  } else {
    throw new Error(
      'Invalid selector type. Use string, { dataTestSubj: string }, or { locator: string }'
    );
  }
}
