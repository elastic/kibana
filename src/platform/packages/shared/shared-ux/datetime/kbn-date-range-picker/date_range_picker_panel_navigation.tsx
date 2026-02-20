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
  type PropsWithChildren,
} from 'react';

import type { IconType } from '@elastic/eui';

/** Metadata describing a navigatable panel inside the date range picker dialog. */
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
 * Use inside a `DateRangePickerPanelNavigationProvider`.
 */
export function DateRangePickerPanel({
  id,
  children,
}: PropsWithChildren<DateRangePickerPanelProps>) {
  const { activePanelId } = useDateRangePickerPanelNavigation();

  if (activePanelId !== id) {
    return null;
  }

  return <>{children}</>;
}
