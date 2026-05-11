/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import type { LeaderKeyShortcutGroup } from './types';
import {
  getScreenReaderShortcutDescription,
  hasModifierKey,
  isEditableTarget,
  normalizeShortcutKey,
} from './shortcut_utils';
import {
  ShortcutsOverlay,
  ShortcutsOverlayDivider,
  ShortcutsOverlayItem,
  type ShortcutsOverlayRef,
} from './shortcuts_overlay';
import { useShortcutsContext } from './shortcuts_provider';

/**
 * Props for {@link LeaderKeyShortcuts}.
 */
export type LeaderKeyShortcutsProps = LeaderKeyShortcutGroup;

/**
 * Renders a leader-key shortcut overlay and handles the two-step key sequence used to trigger
 * the provided shortcuts.
 *
 * Multiple instances can be mounted at once. The component coordinates those instances so only
 * one leader-key menu can own the active sequence at a time.
 */
export const LeaderKeyShortcuts = ({
  leaderKey,
  leaderKeyDescription,
  shortcuts,
}: LeaderKeyShortcutsProps) => {
  const { registerLeaderKeyGroup } = useShortcutsContext();
  const overlayRef = useRef<ShortcutsOverlayRef | null>(null);
  const normalizedLeaderKey = normalizeShortcutKey(leaderKey);
  const shortcutsByKey = useMemo(
    () => new Map(shortcuts.map((shortcut) => [normalizeShortcutKey(shortcut.key), shortcut])),
    [shortcuts]
  );
  const screenReaderHint = useMemo(() => {
    return i18n.translate('unifiedShortcuts.leaderKeyShortcuts.screenReaderHint', {
      defaultMessage: 'Press {leaderKey} for {leaderKeyDescription} shortcuts.',
      values: {
        leaderKeyDescription,
        leaderKey: leaderKey.toUpperCase(),
      },
    });
  }, [leaderKey, leaderKeyDescription]);
  const screenReaderAnnouncement = useMemo(() => {
    return i18n.translate('unifiedShortcuts.leaderKeyShortcuts.screenReaderAnnouncement', {
      defaultMessage:
        '{leaderKeyDescription} shortcuts available. {shortcutDescriptions}. Press Escape to exit.',
      values: {
        leaderKeyDescription,
        shortcutDescriptions: shortcuts
          .map((shortcut) => getScreenReaderShortcutDescription(shortcut))
          .join(', '),
      },
    });
  }, [leaderKeyDescription, shortcuts]);
  const overlayItems = useMemo(
    () => [
      <ShortcutsOverlayItem
        key="leader"
        badgeColor="primary"
        badgeLabel={leaderKey.toUpperCase()}
        description={leaderKeyDescription}
      />,
      <ShortcutsOverlayDivider key="leader-divider" />,
      ...shortcuts.map(({ key, label, description }) => (
        <ShortcutsOverlayItem key={key} badgeLabel={label} description={description} />
      )),
    ],
    [leaderKey, leaderKeyDescription, shortcuts]
  );
  const openShortcuts = useCallback(() => {
    overlayRef.current?.open();
  }, []);
  const shouldOpen = useCallback(
    (event: KeyboardEvent) => {
      return (
        normalizeShortcutKey(event.key) === normalizedLeaderKey &&
        !hasModifierKey(event) &&
        !isEditableTarget(event.target)
      );
    },
    [normalizedLeaderKey]
  );
  const runAction = useCallback(
    (event: KeyboardEvent) => {
      shortcutsByKey.get(normalizeShortcutKey(event.key))?.onTrigger();
    },
    [shortcutsByKey]
  );

  useEffect(() => {
    return registerLeaderKeyGroup({
      leaderKey,
      leaderKeyDescription,
      openShortcuts,
      shortcuts,
    });
  }, [leaderKey, leaderKeyDescription, openShortcuts, registerLeaderKeyGroup, shortcuts]);

  return (
    <ShortcutsOverlay
      ref={overlayRef}
      items={overlayItems}
      screenReaderHint={screenReaderHint}
      screenReaderAnnouncement={screenReaderAnnouncement}
      shouldOpen={shouldOpen}
      runAction={runAction}
    />
  );
};
