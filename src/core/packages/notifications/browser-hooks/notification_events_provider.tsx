/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { createContext, useContext, useMemo, type ReactNode } from 'react';
import { type Observable, map, of as rxOf } from 'rxjs';
import type { INotificationEvents } from '@kbn/core-notifications-browser';

const EMPTY_SPACE$ = rxOf<string | undefined>(undefined);

const NotificationEventsContext = createContext<INotificationEvents | null>(null);

interface NotificationSpacesContextValue {
  activeSpaceId$: Observable<string | undefined>;
  spacesEnabled: boolean;
}

const NotificationSpacesContext = createContext<NotificationSpacesContextValue | null>(null);

/**
 * Minimal subset of the spaces plugin that the provider needs.
 * Callers pass the full `SpacesPluginStart`; we only bind to the parts we use.
 */
export interface SpacesDependency {
  getActiveSpace$: () => Observable<{ id: string }>;
}

export interface NotificationEventsProviderProps {
  children: ReactNode;
  events: INotificationEvents;
  spaces?: SpacesDependency;
}

export function NotificationEventsProvider({
  children,
  events,
  spaces,
}: NotificationEventsProviderProps) {
  const spacesValue = useMemo<NotificationSpacesContextValue>(
    () => ({
      activeSpaceId$: spaces ? spaces.getActiveSpace$().pipe(map((s) => s.id)) : EMPTY_SPACE$,
      spacesEnabled: Boolean(spaces),
    }),
    [spaces]
  );

  return (
    <NotificationEventsContext.Provider value={events}>
      <NotificationSpacesContext.Provider value={spacesValue}>
        {children}
      </NotificationSpacesContext.Provider>
    </NotificationEventsContext.Provider>
  );
}

export function useNotificationEventsService(): INotificationEvents {
  const ctx = useContext(NotificationEventsContext);
  if (!ctx) {
    throw new Error(
      'useNotificationEventsService must be used within a NotificationEventsProvider'
    );
  }
  return ctx;
}

export function useNotificationSpaces(): NotificationSpacesContextValue {
  const ctx = useContext(NotificationSpacesContext);
  if (!ctx) {
    throw new Error('useNotificationSpaces must be used within a NotificationEventsProvider');
  }
  return ctx;
}
