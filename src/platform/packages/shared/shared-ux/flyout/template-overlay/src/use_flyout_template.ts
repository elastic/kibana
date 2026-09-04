/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { OverlayRef } from '@kbn/core-mount-utils-browser';
import type {
  OverlayFlyoutTemplateChildren,
  OverlayFlyoutTemplateOpenOptions,
  OverlayStart,
} from '@kbn/core-overlays-browser';

/**
 * The flyout unmounts from a React root the trigger does not belong to, so focus has to be
 * restored after that root has finished tearing down.
 */
const FOCUS_RESTORE_DELAY = 100;

/** @public */
export interface UseFlyoutTemplateOptions {
  /** Focused once the flyout closes, unless the calling component has unmounted. */
  returnFocusTo?: RefObject<HTMLElement | null>;
}

/** @public */
export interface UseFlyoutTemplateResult {
  /** Opens the flyout, replacing one this hook already has open. */
  open: (
    options: OverlayFlyoutTemplateOpenOptions,
    children: OverlayFlyoutTemplateChildren
  ) => OverlayRef;
  /** Closes the flyout this hook has open. A no-op when there is none. */
  close: () => void;
  isOpen: boolean;
}

/**
 * Owns the lifecycle around `overlays.openFlyoutTemplate` for a React caller: the
 * {@link OverlayRef}, whether a flyout is currently open, closing it if the calling component
 * unmounts, and returning focus to a trigger element afterwards.
 *
 * @public
 */
export const useFlyoutTemplate = (
  overlays: Pick<OverlayStart, 'openFlyoutTemplate'>,
  { returnFocusTo }: UseFlyoutTemplateOptions = {}
): UseFlyoutTemplateResult => {
  const flyoutRef = useRef<OverlayRef | null>(null);
  const isMountedRef = useRef(true);
  const focusRestoreTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const [isOpen, setIsOpen] = useState(false);

  // Read when a flyout closes, which can be long after the render that supplied it.
  const returnFocusToRef = useRef(returnFocusTo);
  returnFocusToRef.current = returnFocusTo;

  useEffect(() => {
    // Reset rather than rely on the ref initializer, which does not re-run when a fiber is
    // torn down and re-mounted.
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      clearTimeout(focusRestoreTimerRef.current);
      flyoutRef.current?.close();
      flyoutRef.current = null;
    };
  }, []);

  const open = useCallback(
    (
      options: OverlayFlyoutTemplateOpenOptions,
      children: OverlayFlyoutTemplateChildren
    ): OverlayRef => {
      clearTimeout(focusRestoreTimerRef.current);
      flyoutRef.current?.close();

      const ref = overlays.openFlyoutTemplate(options, children);
      flyoutRef.current = ref;
      setIsOpen(true);

      // Resolves for every close path — the flyout's own controls, `close()`, or unmount — so
      // the consumer's `onClose` stays untouched.
      ref.onClose.then(() => {
        // A replacement flyout can already own the hook by the time this resolves: closing the
        // outgoing one above only queues this, so it must not report the replacement closed or
        // take focus off it.
        if (flyoutRef.current !== ref) {
          return;
        }
        flyoutRef.current = null;

        if (!isMountedRef.current) {
          return;
        }
        setIsOpen(false);

        const trigger = returnFocusToRef.current?.current;
        if (trigger) {
          focusRestoreTimerRef.current = setTimeout(() => trigger.focus(), FOCUS_RESTORE_DELAY);
        }
      });

      return ref;
    },
    [overlays]
  );

  const close = useCallback(() => {
    flyoutRef.current?.close();
  }, []);

  // Memoized so the result can sit in an effect's dependency list without re-running it
  // on every render.
  return useMemo(() => ({ open, close, isOpen }), [open, close, isOpen]);
};
