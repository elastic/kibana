/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useChromeService } from '@kbn/core-chrome-browser-context';

/**
 * Returns `true` when Chrome Next is enabled.
 * Note: this only checks the feature flag, it does not check whether current chrome is classic vs project.
 * Combine with `useChromeStyle` to check if the current chrome is classic vs project.
 */
export function useIsNextChrome(): boolean {
  const chrome = useChromeService();
  return chrome.next.isEnabled;
}
