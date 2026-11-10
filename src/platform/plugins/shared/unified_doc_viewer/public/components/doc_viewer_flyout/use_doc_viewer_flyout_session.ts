/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useLayoutEffect, useRef } from 'react';
import { getFlyoutManagerStore } from '@elastic/eui';

export interface UseDocViewerFlyoutSessionParams {
  /** Id of the doc viewer's managed `EuiFlyout`. */
  flyoutId: string;
  /** History group the doc viewer flyout starts. */
  historyKey: symbol;
  /** Id of the displayed document, or undefined while it resolves. */
  hitId?: string;
  onClose: () => void;
}

const isRegistered = (flyoutId: string): boolean =>
  getFlyoutManagerStore()
    .getState()
    .flyouts.some((flyout) => flyout.flyoutId === flyoutId);

/**
 * Drops the sessions opened on top of the doc viewer within its history group, bringing it back
 * to the front (same as picking it in the flyout Back history).
 */
const surfaceOwnSession = (flyoutId: string, historyKey: symbol): void => {
  const store = getFlyoutManagerStore();
  const { sessions } = store.getState();
  const ownIndex = sessions.findIndex(({ mainFlyoutId }) => mainFlyoutId === flyoutId);

  if (ownIndex === -1) {
    return;
  }

  const hasNewerSessionInGroup = sessions
    .slice(ownIndex + 1)
    .some((session) => session.historyKey === historyKey);

  if (hasNewerSessionInGroup) {
    store.goToFlyout(flyoutId, 'main');
  }
};

/**
 * Ties the flyouts stacked on the doc viewer's history group (e.g. ones opened in other React
 * roots, which outlive it) to the doc viewer and the document it displays, and reports the doc
 * viewer as closed when the flyout manager removes it.
 */
export const useDocViewerFlyoutSession = ({
  flyoutId,
  historyKey,
  hitId,
  onClose,
}: UseDocViewerFlyoutSessionParams): void => {
  const onCloseRef = useRef(onClose);
  const previousHitIdRef = useRef(hitId);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Runs before the managed flyout's own cleanup (parents clean up first on unmount), so the
  // doc viewer is the current session again and closing it closes its whole history group.
  useLayoutEffect(() => () => surfaceOwnSession(flyoutId, historyKey), [flyoutId, historyKey]);

  // Flyouts stacked on the doc viewer belong to the previous document.
  useEffect(() => {
    const { current: previousHitId } = previousHitIdRef;
    previousHitIdRef.current = hitId;

    if (previousHitId !== undefined && hitId !== undefined && previousHitId !== hitId) {
      surfaceOwnSession(flyoutId, historyKey);
    }
  }, [flyoutId, historyKey, hitId]);

  // EUI loses track of a managed flyout's registration when it re-registers (e.g. its title
  // changes once a linked document resolves), and then does not call `onClose` when a history group
  // close removes it. TODO: remove once EuiManagedFlyout re-arms `wasRegisteredRef` after `addFlyout`.
  useEffect(() => {
    let isMounted = true;
    let wasRegistered = isRegistered(flyoutId);
    let removalCheck: ReturnType<typeof setTimeout> | undefined;

    const unsubscribe = getFlyoutManagerStore().subscribe(() => {
      const isNowRegistered = isRegistered(flyoutId);

      if (wasRegistered && !isNowRegistered) {
        // Deferred: re-registration removes and re-adds the flyout synchronously.
        clearTimeout(removalCheck);
        removalCheck = setTimeout(() => {
          if (isMounted && !isRegistered(flyoutId)) {
            onCloseRef.current();
          }
        }, 0);
      }

      wasRegistered = isNowRegistered;
    });

    return () => {
      isMounted = false;
      clearTimeout(removalCheck);
      unsubscribe();
    };
  }, [flyoutId]);
};
