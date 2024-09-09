/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useMemo, useState } from 'react';
import { EuiFlyoutProps } from '@elastic/eui';
import { useExpandableFlyoutContext } from '../context';

const expandableFlyoutLocalStorageKey = 'expandableFlyout.';
const pushVsOverlayModeLocalStorageKey = 'pushVsOverlayMode.';

export interface UseFlyoutTypeResult {
  /**
   * The current flyout type
   */
  flyoutType: EuiFlyoutProps['type'];
  /**
   * Callback to change the flyout type
   */
  flyoutTypeChange: (flyoutType: EuiFlyoutProps['type']) => void;
}

/**
 * Hook to store and retrieve the flyout type (push vs overlay) from local storage.
 * The key is generated based on the current URL key.
 */
export const useFlyoutType = (): UseFlyoutTypeResult => {
  const { urlKey } = useExpandableFlyoutContext();
  const pushVsOverlayLocalStorageKey = useMemo(
    () => `${expandableFlyoutLocalStorageKey}${pushVsOverlayModeLocalStorageKey}${urlKey}`,
    [urlKey]
  );

  const initialFlyoutType: EuiFlyoutProps['type'] =
    (localStorage.getItem(pushVsOverlayLocalStorageKey) as EuiFlyoutProps['type']) || 'overlay';

  const [flyoutType, setFlyoutType] = useState<EuiFlyoutProps['type']>(initialFlyoutType);

  const flyoutTypeChange = useCallback(
    (type: EuiFlyoutProps['type']) => {
      // we only save to localStorage the value for flyouts that have a urlKey.
      // The state of the memory flyout is not persisted.
      if (urlKey && type) {
        localStorage.setItem(pushVsOverlayLocalStorageKey, type);
      }
      setFlyoutType(type);
    },
    [pushVsOverlayLocalStorageKey, setFlyoutType, urlKey]
  );

  return {
    flyoutType,
    flyoutTypeChange,
  };
};
