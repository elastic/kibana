/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useState } from 'react';
import useUnmount from 'react-use/lib/useUnmount';
import { useShortcutsContext } from './shortcuts_provider';
import {
  consumeKeyboardEvent,
  hasModifierKey,
  isLeaderShortcutPickerTrigger,
  normalizeShortcutKey,
} from './shortcut_utils';
import { ShortcutsOverlay, ShortcutsOverlayItem } from './shortcuts_overlay';
import { useShortcutsOverlaySession } from './use_shortcuts_overlay_session';

export const LeaderShortcutPicker = () => {
  const {
    claimActiveLeaderKeyInstance,
    registeredLeaderKeyShortcuts,
    releaseActiveLeaderKeyInstance,
    hasOtherActiveLeaderKeyInstance,
  } = useShortcutsContext();
  const [isVisible, setIsVisible] = useState(false);
  const [instanceId] = useState(() => Symbol('leader-shortcut-picker'));
  const leaderShortcutOptions = useMemo(() => {
    return registeredLeaderKeyShortcuts.sort((left, right) =>
      left.leaderKeyDescription.localeCompare(right.leaderKeyDescription)
    );
  }, [registeredLeaderKeyShortcuts]);
  const leaderShortcutOptionsByKey = useMemo(() => {
    return new Map(leaderShortcutOptions.map((option) => [option.leaderKey, option]));
  }, [leaderShortcutOptions]);
  const overlayItems = useMemo(() => {
    return leaderShortcutOptions.map(({ leaderKey, leaderKeyDescription }) => (
      <ShortcutsOverlayItem
        key={leaderKey}
        badgeLabel={leaderKey.toUpperCase()}
        description={leaderKeyDescription}
      />
    ));
  }, [leaderShortcutOptions]);
  const openLeaderShortcutPicker = useCallback(() => {
    if (hasOtherActiveLeaderKeyInstance(instanceId) || leaderShortcutOptions.length === 0) {
      return false;
    }

    claimActiveLeaderKeyInstance(instanceId);
    setIsVisible(true);

    return true;
  }, [
    claimActiveLeaderKeyInstance,
    leaderShortcutOptions.length,
    hasOtherActiveLeaderKeyInstance,
    instanceId,
  ]);
  const closeLeaderShortcutPicker = useCallback(() => {
    releaseActiveLeaderKeyInstance(instanceId);
    setIsVisible(false);
  }, [instanceId, releaseActiveLeaderKeyInstance]);

  useShortcutsOverlaySession({
    isVisible,
    onHiddenKeyDown: (event) => {
      if (!isLeaderShortcutPickerTrigger(event)) {
        return;
      }

      if (openLeaderShortcutPicker()) {
        consumeKeyboardEvent(event);
      }
    },
    onVisibleKeyDown: (event) => {
      consumeKeyboardEvent(event);

      if (event.key === 'Escape') {
        closeLeaderShortcutPicker();
        return;
      }

      const leaderShortcutOption = leaderShortcutOptionsByKey.get(normalizeShortcutKey(event.key));

      if (leaderShortcutOption !== undefined && !hasModifierKey(event)) {
        closeLeaderShortcutPicker();
        leaderShortcutOption.openShortcuts();
        return;
      }

      closeLeaderShortcutPicker();
    },
    onVisiblePointerDown: closeLeaderShortcutPicker,
  });

  useUnmount(() => {
    releaseActiveLeaderKeyInstance(instanceId);
  });

  return <ShortcutsOverlay isVisible={isVisible} items={overlayItems} />;
};
