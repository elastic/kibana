/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  useRef,
  useLayoutEffect,
  type PropsWithChildren,
} from 'react';

import type { IconType } from '@elastic/eui';

import { FOCUSABLE_SELECTOR } from './constants';

/** Metadata describing a navigable panel inside the date range picker dialog. */
export interface DateRangePickerPanelDescriptor {
  /** Unique panel identifier, used for navigation */
  id: string;
  /** Title shown in panel header or navigation button */
  title: string;
  /** Icon type passed to `EuiIcon` for the panel navigation item */
  icon?: IconType;
}

/** Context value exposed via `useDateRangePickerPanelNavigation()`. */
export interface DateRangePickerPanelNavigationContextValue {
  /** Id of the currently visible panel */
  activePanelId: string;
  /** Descriptors for all registered panels */
  panelDescriptors: DateRangePickerPanelDescriptor[];
  /** Push a panel onto the history stack and navigate to it */
  navigateTo: (panelId: string) => void;
  /** Pop back to the previous panel and navigate back */
  goBack: () => void;
  /** Whether there is a previous panel to go back to */
  canGoBack: boolean;
}

const PanelNavigationContext = createContext<DateRangePickerPanelNavigationContextValue | null>(
  null
);

/**
 * Hook to access panel navigation inside the date range picker dialog.
 * Must be used within a `DateRangePickerPanelNavigationProvider`.
 */
export function useDateRangePickerPanelNavigation(): DateRangePickerPanelNavigationContextValue {
  const context = useContext(PanelNavigationContext);
  if (!context) {
    throw new Error(
      'useDateRangePickerPanelNavigation must be used within a DateRangePickerPanelNavigationProvider'
    );
  }
  return context;
}

interface DateRangePickerPanelNavigationProviderProps {
  /** Panel id to show on initial mount */
  defaultPanelId: string;
  /** Descriptors for all panels available for navigation */
  panelDescriptors: DateRangePickerPanelDescriptor[];
}

/**
 * Provider that manages panel navigation state via a history stack.
 * Resets to `defaultPanelId` when unmounted and remounted (e.g. popover close/reopen).
 */
export function DateRangePickerPanelNavigationProvider({
  defaultPanelId,
  panelDescriptors,
  children,
}: PropsWithChildren<DateRangePickerPanelNavigationProviderProps>) {
  const [history, setHistory] = useState<string[]>([defaultPanelId]);

  const activePanelId = history[history.length - 1];

  const navigateTo = useCallback((panelId: string) => {
    setHistory((prev) => [...prev, panelId]);
  }, []);

  const goBack = useCallback(() => {
    setHistory((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, []);

  const canGoBack = history.length > 1;

  const contextValue = useMemo<DateRangePickerPanelNavigationContextValue>(
    () => ({
      activePanelId,
      panelDescriptors,
      navigateTo,
      goBack,
      canGoBack,
    }),
    [activePanelId, panelDescriptors, navigateTo, goBack, canGoBack]
  );

  return (
    <PanelNavigationContext.Provider value={contextValue}>
      {children}
    </PanelNavigationContext.Provider>
  );
}

interface DateRangePickerPanelProps {
  /** Panel identifier; children render only when this matches the active panel */
  id: string;
}

/**
 * Gate component that renders its children only when the panel is active.
 * Automatically saves and restores focus when navigating away and back,
 * so keyboard users return to the element they last interacted with.
 *
 * Use inside a `DateRangePickerPanelNavigationProvider`.
 */
export function DateRangePickerPanel({
  id,
  children,
}: PropsWithChildren<DateRangePickerPanelProps>) {
  const { activePanelId } = useDateRangePickerPanelNavigation();
  const isActive = activePanelId === id;
  const containerRef = useFocusRestore(isActive);

  if (!isActive) {
    return null;
  }

  return <div ref={containerRef}>{children}</div>;
}

/**
 * Saves the index of the focused element when `isActive` becomes false,
 * and restores focus to that index when `isActive` becomes true again.
 *
 * Focus is captured during the render phase (before React commits DOM
 * changes) so the previous container and `document.activeElement` are
 * still valid. Restoration runs in a layout effect before paint.
 *
 * @returns A ref to attach to the container element.
 */
function useFocusRestore(isActive: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);
  const focusedIndexRef = useRef(-1);
  const wasActiveRef = useRef(false);

  if (wasActiveRef.current && !isActive && containerRef.current) {
    const focusables = containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    const activeElement = document.activeElement;
    focusedIndexRef.current =
      activeElement instanceof HTMLElement ? Array.from(focusables).indexOf(activeElement) : -1;
  }
  wasActiveRef.current = isActive;

  useLayoutEffect(() => {
    if (!isActive || focusedIndexRef.current < 0) return;
    const container = containerRef.current;
    if (!container) return;

    const idx = focusedIndexRef.current;
    focusedIndexRef.current = -1;

    const focusables = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    const target = focusables[Math.min(idx, focusables.length - 1)];
    if (target) {
      target.focus();
    }
  }, [isActive]);

  return containerRef;
}
