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
 * Puts `request` in the editor once the editor holds a syntax error, so that a marker count
 * asserted by the caller afterwards describes `request` rather than the previous input.
 * Markers are published from a web worker, so asserting on them straight after entering
 * text can pass before validation has run.
 */
export const enterRequestFromSyntaxErrorState = async (
  consolePage: ConsolePage,
  request: string
) => {
  await consolePage.enterSyntaxErrorSentinel();
  await expect(consolePage.invalidSyntaxMarker).not.toHaveCount(0);

  await consolePage.replaceAllText(request);
};

/**
 * Puts `request` in the editor once the editor is empty and free of markers, so that a
 * marker count asserted by the caller afterwards describes `request` rather than the
 * previous input.
 */
export const enterRequestFromCleanSyntaxState = async (
  consolePage: ConsolePage,
  request: string
) => {
  await consolePage.clearEditorText();
  await expect(consolePage.invalidSyntaxMarker).toHaveCount(0);

  await consolePage.enterText(request);
};
