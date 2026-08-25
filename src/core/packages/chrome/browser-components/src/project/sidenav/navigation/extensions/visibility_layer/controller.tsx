/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useMemo } from 'react';

import { useChromeService } from '@kbn/core-chrome-browser-context';

import { useExtensionVisibilityStore } from './context';
import type { NavigationItems } from '../../to_navigation_items';

/**
 * Controller for the extension visibility layer.
 * It is responsible for syncing the extension ids and reporting the data to the store.
 * */
export const ExtensionVisibilityController = ({
  baseItems,
}: {
  baseItems: NavigationItems | null;
}) => {
  const chrome = useChromeService();
  const store = useExtensionVisibilityStore();
  const extensionIds = useMemo(
    () => (baseItems ? Array.from(baseItems.hideWhenEmptyExtensionIds) : []),
    [baseItems]
  );

  useEffect(() => {
    store.syncExtensionIds(extensionIds);
  }, [store, extensionIds]);

  useEffect(() => {
    if (extensionIds.length === 0) {
      return;
    }

    const subscriptions = extensionIds.map((extensionId) => {
      const data$ = chrome.project.getExtensionData$(extensionId);

      if (!data$) {
        store.reportData(extensionId, null);
        return undefined;
      }

      return data$.subscribe((data) => {
        store.reportData(extensionId, data);
      });
    });

    return () => {
      for (const subscription of subscriptions) {
        subscription?.unsubscribe();
      }
    };
  }, [chrome, extensionIds, store]);

  return null;
};
