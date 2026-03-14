/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ChromeStyle } from '@kbn/core-chrome-browser';
import { useObservable } from '@kbn/use-observable';
import { useChromeService } from '@kbn/core-chrome-browser-context';

/**
 * Returns the current chrome UI style (`'classic'` or `'project'`).
 * Defaults to `'classic'` until explicitly changed.
 */
export function useChromeStyle(): ChromeStyle {
  const chrome = useChromeService();
  return useObservable(chrome.getChromeStyle$(), chrome.getChromeStyle());
}
