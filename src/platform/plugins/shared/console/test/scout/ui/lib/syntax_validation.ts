/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import type { ConsolePage } from '../fixtures/page_objects/console_page';

/**
 * Puts `request` in the editor starting from a state that has a syntax error, so that
 * reaching zero markers proves validation ran. Markers are published from a web worker, so
 * asserting on them straight after entering text can pass before it has.
 */
export const enterRequestClearingSyntaxErrors = async (
  consolePage: ConsolePage,
  request: string
) => {
  await consolePage.enterSyntaxErrorSentinel();
  await expect(consolePage.invalidSyntaxMarker).not.toHaveCount(0);

  await consolePage.replaceAllText(request);
};
