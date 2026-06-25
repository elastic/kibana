/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useContext } from 'react';
import { getFlyoutManagerStore } from '@elastic/eui';
import { FlyoutHistoryContext } from './history_context';

/** Closes all flyouts in the current history group. */
export const useCloseHistoryGroup = (): (() => void) => {
  const historyKey = useContext(FlyoutHistoryContext)?.historyKey;

  return useCallback(() => {
    if (historyKey === undefined) return;

    const store = getFlyoutManagerStore();
    const { sessions } = store.getState();

    sessions
      .filter((session) => session.historyKey === historyKey)
      .forEach((session) => store.closeFlyout(session.mainFlyoutId));
  }, [historyKey]);
};

export const useGoBack = (): (() => void) => {
  return useCallback(() => getFlyoutManagerStore().goBack(), []);
};

export const useGoToFlyout = (): ((flyoutId: string) => void) => {
  return useCallback((flyoutId: string) => getFlyoutManagerStore().goToFlyout(flyoutId), []);
};
