/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { useObservable } from '@kbn/use-observable';
import { useChromeService } from '@kbn/core-chrome-browser-context';

/**
 * Returns the AI button ReactNode set via `chrome.next.aiButton.set()`,
 * or `undefined` if not set. Used by the Chrome-Next header.
 */
export function useAiButton(): ReactNode | undefined {
  const chrome = useChromeService();
  const node$ = useMemo(() => chrome.next.aiButton.get$(), [chrome]);
  return useObservable(node$, undefined);
}
