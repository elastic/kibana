/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import useUnmount from 'react-use/lib/useUnmount';
import { i18n } from '@kbn/i18n';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLiveAnnouncer,
  EuiPanel,
  EuiPortal,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';

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

interface ShortcutDisplayProps {
  badgeColor?: 'primary' | 'hollow';
  badgeLabel: string;
  description: string;
}

const editableTargetSelector = [
  'input',
  'textarea',
  'select',
  '[contenteditable]:not([contenteditable="false"])',
  '[role="textbox"]',
  '.ace_editor',
  '.monaco-editor',
].join(', ');

const normalizeShortcutKey = (key: string) => key.toLowerCase();

let activeLeaderKeyInstance: symbol | undefined;

const claimLeaderKeyInstance = (instanceId: symbol) => {
  activeLeaderKeyInstance = instanceId;
};

const releaseLeaderKeyInstance = (instanceId: symbol) => {
  if (activeLeaderKeyInstance === instanceId) {
    activeLeaderKeyInstance = undefined;
  }
};

const hasOtherActiveLeaderKeyInstance = (instanceId: symbol) => {
  return activeLeaderKeyInstance !== undefined && activeLeaderKeyInstance !== instanceId;
};

const hasModifierKey = (event: KeyboardEvent) => {
  return event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
};

const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof Element)) {
    return false;
  }

  return (
    (target instanceof HTMLElement && target.isContentEditable) ||
    Boolean(target.closest(editableTargetSelector))
  );
};

const consumeKeyboardEvent = (event: KeyboardEvent) => {
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
};

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

const LeaderKeyDivider = () => {
  const { euiTheme } = useEuiTheme();

  return (
    <div
      css={css`
        width: ${euiTheme.border.width.thin};
        align-self: stretch;
        background-color: ${euiTheme.colors.borderBasePlain};
      `}
    />
  );
};

const ShortcutDisplay = ({
  badgeColor = 'hollow',
  badgeLabel,
  description,
}: ShortcutDisplayProps) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false} wrap={false}>
      <EuiBadge color={badgeColor}>{badgeLabel}</EuiBadge>
      <EuiText
        size="xs"
        css={css`
          white-space: nowrap;
          font-weight: ${euiTheme.font.weight.medium};
        `}
      >
        {description}
      </EuiText>
    </EuiFlexGroup>
  );
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
  const [isVisible, setIsVisible] = useState(false);
  const [instanceId] = useState(() => Symbol(`leader-key-shortcuts:${leaderKey}`));
  const { euiTheme } = useEuiTheme();
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
  const openShortcuts = useCallback(() => {
    claimLeaderKeyInstance(instanceId);
    setLiveAnnouncement(screenReaderAnnouncement);
    setIsVisible(true);
  }, [instanceId, screenReaderAnnouncement]);
  const closeShortcuts = useCallback(() => {
    releaseLeaderKeyInstance(instanceId);
    setLiveAnnouncement(undefined);
    setIsVisible(false);
  }, [instanceId]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isVisible) {
        if (hasOtherActiveLeaderKeyInstance(instanceId)) {
          return;
        }

        if (
          normalizeShortcutKey(event.key) === normalizedLeaderKey &&
          !hasModifierKey(event) &&
          !isEditableTarget(event.target)
        ) {
          consumeKeyboardEvent(event);
          openShortcuts();
        }

        return;
      }

      if (hasModifierKey(event) || isEditableTarget(event.target)) {
        closeShortcuts();
        return;
      }

      consumeKeyboardEvent(event);

      if (event.key === 'Escape') {
        closeShortcuts();
        return;
      }

      const shortcut = shortcutsByKey.get(normalizeShortcutKey(event.key));
      shortcut?.onTrigger();
      closeShortcuts();
    };

    const onPointerDown = () => {
      if (isVisible) {
        closeShortcuts();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('pointerdown', onPointerDown, true);

    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, [closeShortcuts, instanceId, isVisible, normalizedLeaderKey, openShortcuts, shortcutsByKey]);

  useUnmount(() => {
    releaseLeaderKeyInstance(instanceId);
  });

  return (
    <>
      {liveAnnouncement ? <EuiLiveAnnouncer>{liveAnnouncement}</EuiLiveAnnouncer> : null}

      <EuiPortal>
        <EuiPanel
          aria-hidden="true"
          paddingSize="m"
          css={css`
            position: fixed;
            right: ${euiTheme.size.l};
            bottom: ${euiTheme.size.l};
            z-index: ${euiTheme.levels.toast};
            pointer-events: none;
            max-width: calc(100vw - ${euiTheme.size.l} * 2);
            opacity: ${isVisible ? 1 : 0};
            transform: translateY(${isVisible ? '0' : euiTheme.size.s});
            transition: opacity ${euiTheme.animation.fast} ${euiTheme.animation.resistance},
              transform ${euiTheme.animation.fast} ${euiTheme.animation.resistance};
            will-change: opacity, transform;
          `}
        >
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap={true}>
            <EuiFlexItem grow={false}>
              <ShortcutDisplay
                badgeColor="primary"
                badgeLabel={leaderKey.toUpperCase()}
                description={leaderKeyDescription}
              />
            </EuiFlexItem>

            <LeaderKeyDivider />

            {shortcuts.map((shortcut) => (
              <EuiFlexItem grow={false} key={shortcut.key}>
                <ShortcutDisplay badgeLabel={shortcut.label} description={shortcut.description} />
              </EuiFlexItem>
            ))}

            <LeaderKeyDivider />

            <EuiBadge>
              {i18n.translate('unifiedShortcuts.leaderKeyShortcuts.escapeLabel', {
                defaultMessage: 'esc',
              })}
            </EuiBadge>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiPortal>
    </>
  );
};
