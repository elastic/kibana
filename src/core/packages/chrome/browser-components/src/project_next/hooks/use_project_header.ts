/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import type { ChromeProjectHeaderConfig } from '@kbn/core-chrome-browser';
import { useObservable } from '@kbn/use-observable';
import { useChromeService } from '@kbn/core-chrome-browser-context';

/**
 * Returns the current project header configuration set via
 * `chrome.projectHeader.set()`, or `undefined` if not set.
 * Used by Chrome-Next top bar components.
 */
export function useProjectHeader(): ChromeProjectHeaderConfig | undefined {
  const chrome = useChromeService();
  const config$ = useMemo(() => chrome.projectHeader.get$(), [chrome]);
  return useObservable(config$, undefined);
}
