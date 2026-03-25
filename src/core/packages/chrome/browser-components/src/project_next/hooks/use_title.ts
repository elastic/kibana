/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import { useObservable } from '@kbn/use-observable';
import { useChromeService } from '@kbn/core-chrome-browser-context';
import { useProjectHeader } from './use_project_header';

function extractFirstTitleSegment(fullTitle: string): string {
  return fullTitle.split(' - ')[0]?.trim() || fullTitle;
}

/**
 * Returns the display title for the Chrome-Next project header.
 * Fallback chain: explicit `config.title` -> first segment of doc title -> 'Unknown'.
 */
export function useTitle(): string {
  const config = useProjectHeader();
  const chrome = useChromeService();
  const docTitle$ = useMemo(() => chrome.docTitle.title$, [chrome]);
  const fullDocTitle = useObservable(docTitle$, document.title);

  return config?.title ?? extractFirstTitleSegment(fullDocTitle) ?? 'Unknown';
}
