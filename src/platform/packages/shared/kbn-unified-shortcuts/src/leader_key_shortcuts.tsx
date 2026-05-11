/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiLiveAnnouncer } from '@elastic/eui';
import { hasModifierKey, isEditableTarget, normalizeShortcutKey } from './shortcut_utils';
import {
  ShortcutsOverlay,
  ShortcutsOverlayDivider,
  ShortcutsOverlayItem,
  type ShortcutsOverlayRef,
} from './shortcuts_overlay';
import { useShortcutsContext } from './shortcuts_provider';

/**
 * Describes a single follow-up key that can be pressed after a leader key sequence is opened.
 */
export interface LeaderKeyShortcut {
  /** The key that triggers this shortcut once the leader key overlay is active. */
  key: string;
  /** The short label rendered in the shortcut badge. */
  label: string;
  /** The human-readable description shown in the overlay and announced to assistive tech. */
  description: string;
  /** Runs when the shortcut key is pressed while this leader key menu is active. */
  onTrigger: () => void;
}

/**
 * Props for {@link LeaderKeyShortcuts}.
 */
export interface LeaderKeyShortcutsProps {
  /** The key that opens this shortcut group. */
  leaderKey: string;
  /** The label shown for the leader key in the overlay and accessibility text. */
  leaderKeyDescription: string;
  /** The follow-up shortcuts available after the leader key is pressed. */
  shortcuts: LeaderKeyShortcut[];
}

const getScreenReaderShortcutKeyLabel = (key: string) => {
  switch (key) {
    case 'ArrowLeft':
      return i18n.translate('unifiedShortcuts.leaderKeyShortcuts.screenReaderArrowLeftLabel', {
        defaultMessage: 'left arrow',
      });
    case 'ArrowRight':
      return i18n.translate('unifiedShortcuts.leaderKeyShortcuts.screenReaderArrowRightLabel', {
        defaultMessage: 'right arrow',
      });
    default:
      return key.toLowerCase();
  }
};

const getScreenReaderShortcutDescription = ({
  key,
  description,
}: Pick<LeaderKeyShortcut, 'key' | 'description'>) => {
  return i18n.translate('unifiedShortcuts.leaderKeyShortcuts.screenReaderShortcutDescription', {
    defaultMessage: '{key} for {description}',
    values: {
      key: getScreenReaderShortcutKeyLabel(key),
      description,
    },
  });
};

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
  const { registerLeaderKeyShortcut } = useShortcutsContext();
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
  const [liveAnnouncement, setLiveAnnouncement] = useState<string | undefined>(
    () => screenReaderHint
  );
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
  const handleOpen = useCallback(() => {
    setLiveAnnouncement(screenReaderAnnouncement);
  }, [screenReaderAnnouncement]);
  const handleClose = useCallback(() => {
    setLiveAnnouncement(undefined);
  }, []);

  useEffect(() => {
    return registerLeaderKeyShortcut({
      leaderKey,
      leaderKeyDescription,
      openShortcuts,
    });
  }, [leaderKey, leaderKeyDescription, openShortcuts, registerLeaderKeyShortcut]);

  return (
    <>
      {liveAnnouncement ? <EuiLiveAnnouncer>{liveAnnouncement}</EuiLiveAnnouncer> : null}
      <ShortcutsOverlay
        ref={overlayRef}
        items={overlayItems}
        shouldOpen={shouldOpen}
        runAction={runAction}
        onOpen={handleOpen}
        onClose={handleClose}
      />
    </>
  );
};
