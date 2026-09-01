/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useLayoutEffect } from 'react';
import { useChromeService } from '@kbn/core-chrome-browser-context';

/**
 * Claims the Chrome Next inline app-header slot so Chrome does not also render a chrome-owned header.
 */
export const useInlineAppHeader = (): void => {
  const chrome = useChromeService();
  useLayoutEffect(() => {
    chrome.next.inlineAppHeader.set(true);
    return () => chrome.next.inlineAppHeader.set(false);
  }, [chrome]);
};
