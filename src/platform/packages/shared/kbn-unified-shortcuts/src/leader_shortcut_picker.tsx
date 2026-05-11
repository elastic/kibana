/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { isMac } from '@kbn/shared-ux-utility';
import { useShortcutsContext } from './shortcuts_provider';
import {
  getScreenReaderShortcutDescription,
  isPrimaryModifierOnly,
  normalizeShortcutKey,
} from './shortcut_utils';
import { ShortcutsOverlay, ShortcutsOverlayItem } from './shortcuts_overlay';

export const LeaderShortcutPicker = () => {
  const { registeredLeaderKeyShortcuts } = useShortcutsContext();
  const sortedLeaderKeyShortcuts = useMemo(() => {
    return registeredLeaderKeyShortcuts.toSorted((left, right) =>
      left.leaderKeyDescription.localeCompare(right.leaderKeyDescription)
    );
  }, [registeredLeaderKeyShortcuts]);
  const leaderKeyShortcutsByKey = useMemo(() => {
    return new Map(sortedLeaderKeyShortcuts.map((option) => [option.leaderKey, option]));
  }, [sortedLeaderKeyShortcuts]);
  const overlayItems = useMemo(() => {
    return sortedLeaderKeyShortcuts.map(({ leaderKey, leaderKeyDescription }) => (
      <ShortcutsOverlayItem
        key={leaderKey}
        badgeLabel={leaderKey.toUpperCase()}
        description={leaderKeyDescription}
      />
    ));
  }, [sortedLeaderKeyShortcuts]);
  const screenReaderHint = useMemo(() => {
    return i18n.translate('unifiedShortcuts.leaderShortcutPicker.screenReaderHint', {
      defaultMessage: 'Press {shortcut} to access all shortcuts.',
      values: {
        shortcut: isMac ? 'Command apostrophe' : 'Control apostrophe',
      },
    });
  }, []);
  const screenReaderAnnouncement = useMemo(() => {
    return i18n.translate('unifiedShortcuts.leaderShortcutPicker.screenReaderAnnouncement', {
      defaultMessage: 'Shortcuts available. {shortcutDescriptions}. Press Escape to exit.',
      values: {
        shortcutDescriptions: sortedLeaderKeyShortcuts
          .map(({ leaderKey, leaderKeyDescription }) =>
            getScreenReaderShortcutDescription({
              key: leaderKey,
              description: leaderKeyDescription,
            })
          )
          .join(', '),
      },
    });
  }, [sortedLeaderKeyShortcuts]);
  const shouldOpen = useCallback(
    (event: KeyboardEvent) => {
      return (
        sortedLeaderKeyShortcuts.length > 0 &&
        isPrimaryModifierOnly(event) &&
        event.code === 'Quote'
      );
    },
    [sortedLeaderKeyShortcuts.length]
  );
  const runAction = useCallback(
    (event: KeyboardEvent) => {
      leaderKeyShortcutsByKey.get(normalizeShortcutKey(event.key))?.openShortcuts();
    },
    [leaderKeyShortcutsByKey]
  );

  return (
    <ShortcutsOverlay
      items={overlayItems}
      shouldOpen={shouldOpen}
      runAction={runAction}
      screenReaderHint={screenReaderHint}
      screenReaderAnnouncement={screenReaderAnnouncement}
    />
  );
};
