/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useLayoutEffect, useState } from 'react';
import type { VirtualizerInstanceType } from './types';

/** Starts one root restoration command and lets the virtualizer reconcile subsequent measurements. */
export const useAnchorVirtualizerToItemIndex = (
  virtualizer: VirtualizerInstanceType,
  itemIndex: number | undefined
) => {
  const [isRestored, setIsRestored] = useState(itemIndex === undefined);

  const cancel = useCallback(() => {
    virtualizer.cancelScroll();
    setIsRestored(true);
  }, [virtualizer]);

  useLayoutEffect(() => {
    if (isRestored || itemIndex === undefined) return;
    if (itemIndex >= 0 && itemIndex < virtualizer.options.count) {
      virtualizer.scrollToIndex(itemIndex, { align: 'start', behavior: 'auto' });
    }
    setIsRestored(true);
  }, [virtualizer, virtualizer.options.count, itemIndex, isRestored]);

  return { isRestored, cancel };
};
