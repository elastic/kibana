/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useRef, useState } from 'react';

import { PRIMARY_NAVIGATION_ID } from '../constants';

export const NAV_SHORTCUT_REVEAL_DELAY_MS = 550;
export const MAX_NAV_SHORTCUT_ITEMS = 9;

interface NavShortcutItem {
  id: string;
}

interface NavigatorWithUserAgentData extends Navigator {
  userAgentData?: { platform?: string };
}

/** Returns Meta on macOS and Control on other platforms. */
export const getNavShortcutModifierKey = (): 'Meta' | 'Control' => {
  if (typeof navigator === 'undefined') {
    return 'Control';
  }

  const nav = navigator as NavigatorWithUserAgentData;
  const platform = (
    nav.userAgentData?.platform ??
    nav.userAgent ??
    nav.platform ??
    ''
  ).toLowerCase();

  return platform.includes('mac') ? 'Meta' : 'Control';
};

const isDigitKey = (key: string): boolean => /^[1-9]$/.test(key);

const activateNavItem = (itemId: string): boolean => {
  const root = document.getElementById(PRIMARY_NAVIGATION_ID);
  const target = document.getElementById(itemId);

  if (!root || !target || !root.contains(target)) {
    return false;
  }

  target.click();
  return true;
};

/**
 * Reveals primary-nav shortcut badges while the platform modifier key is held.
 */
export const useNavShortcuts = (items: readonly NavShortcutItem[]) => {
  const [visible, setVisible] = useState(false);
  const itemsRef = useRef(items);
  const visibleRef = useRef(false);
  const modifierHeldRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  itemsRef.current = items;

  useEffect(() => {
    const clearRevealTimer = () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const hideShortcuts = () => {
      clearRevealTimer();
      modifierHeldRef.current = false;

      if (!visibleRef.current) {
        return;
      }

      visibleRef.current = false;
      setVisible(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const modifierKey = getNavShortcutModifierKey();

      if (event.key === modifierKey) {
        if (event.repeat || modifierHeldRef.current) {
          return;
        }

        modifierHeldRef.current = true;
        clearRevealTimer();
        timerRef.current = window.setTimeout(() => {
          timerRef.current = null;

          if (!modifierHeldRef.current) {
            return;
          }

          visibleRef.current = true;
          setVisible(true);
        }, NAV_SHORTCUT_REVEAL_DELAY_MS);
        return;
      }

      if (!visibleRef.current) {
        clearRevealTimer();
        return;
      }

      if (event.repeat || event.altKey || event.shiftKey || event.defaultPrevented) {
        return;
      }

      const modifierDown = modifierKey === 'Meta' ? event.metaKey : event.ctrlKey;

      if (!modifierDown || !isDigitKey(event.key)) {
        return;
      }

      const item = itemsRef.current[Number(event.key) - 1];

      if (!item || !activateNavItem(item.id)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      visibleRef.current = false;
      setVisible(false);
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key !== getNavShortcutModifierKey()) {
        return;
      }

      hideShortcuts();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        hideShortcuts();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', hideShortcuts);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearRevealTimer();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', hideShortcuts);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  return { visible };
};
