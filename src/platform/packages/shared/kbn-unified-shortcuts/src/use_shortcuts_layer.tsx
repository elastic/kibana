/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type ReactNode, useCallback, useEffect, useState } from 'react';
import { EuiLiveAnnouncer } from '@elastic/eui';
import useUnmount from 'react-use/lib/useUnmount';
import { consumeKeyboardEvent } from './shortcut_utils';
import { useShortcutsContext } from './shortcuts_provider';

export interface UseShortcutsLayerOptions {
  instanceIdLabel: string;
  screenReaderHint?: string;
  screenReaderAnnouncement?: string;
  shouldOpen: (event: KeyboardEvent) => boolean;
  runAction?: (event: KeyboardEvent) => void;
}

export interface UseShortcutsLayerResult {
  isVisible: boolean;
  liveAnnouncement: ReactNode;
  open: () => boolean;
  close: () => void;
}

export const useShortcutsLayer = ({
  instanceIdLabel,
  screenReaderHint,
  screenReaderAnnouncement,
  shouldOpen,
  runAction,
}: UseShortcutsLayerOptions): UseShortcutsLayerResult => {
  const { tryAcquireShortcutsLock, releaseShortcutsLock } = useShortcutsContext();
  const [isVisible, setIsVisible] = useState(false);
  const [liveAnnouncement, setLiveAnnouncement] = useState(screenReaderHint);
  const [instanceId] = useState(() => Symbol(instanceIdLabel));
  const open = useCallback(() => {
    if (isVisible) {
      return true;
    }

    const lockAcquired = tryAcquireShortcutsLock(instanceId);

    if (lockAcquired) {
      setLiveAnnouncement(screenReaderAnnouncement);
      setIsVisible(true);
    }

    return lockAcquired;
  }, [instanceId, isVisible, screenReaderAnnouncement, tryAcquireShortcutsLock]);
  const close = useCallback(() => {
    if (isVisible) {
      releaseShortcutsLock(instanceId);
      setLiveAnnouncement(undefined);
      setIsVisible(false);
    }
  }, [instanceId, isVisible, releaseShortcutsLock]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isVisible) {
        const isEsc = event.key === 'Escape';

        if (isEsc || runAction) {
          consumeKeyboardEvent(event);
          close();

          if (!isEsc) {
            runAction?.(event);
          }
        }
      } else if (shouldOpen(event) && open()) {
        consumeKeyboardEvent(event);
      }
    };

    const onPointerDown = () => {
      if (isVisible && runAction) {
        close();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('pointerdown', onPointerDown, true);

    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, [close, isVisible, open, runAction, shouldOpen]);

  useUnmount(() => {
    releaseShortcutsLock(instanceId);
  });

  return {
    isVisible,
    liveAnnouncement: liveAnnouncement ? (
      <EuiLiveAnnouncer>{liveAnnouncement}</EuiLiveAnnouncer>
    ) : undefined,
    open,
    close,
  };
};
