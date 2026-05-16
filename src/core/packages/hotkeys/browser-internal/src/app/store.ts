/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import { createSidebarStore, type SidebarStoreConfig } from '@kbn/core-chrome-sidebar';
import type { HotkeysSidebarActions, HotkeysSidebarState } from '@kbn/core-hotkeys-browser';
import type { HotkeyOverridesPersistence } from '../service/lib/overrides_source';

const hotkeysSidebarSchema = z.object({
  pendingFeatureFocus: z.string().nullable().optional(),
});

/** @internal */
export interface HotkeysSidebarStoreDeps {
  readonly persistence: HotkeyOverridesPersistence;
}

/**
 * Sidebar store for the hotkeys panel (`openToFeature`, etc.).
 *
 * @internal
 */
export const createHotkeysSidebarStore = ({
  persistence,
}: HotkeysSidebarStoreDeps): SidebarStoreConfig<HotkeysSidebarState, HotkeysSidebarActions> =>
  createSidebarStore({
    schema: hotkeysSidebarSchema,
    actions: (set, _get, sidebar) => ({
      openToFeature: (featureId: string) => {
        set({ pendingFeatureFocus: featureId });
        sidebar.open();
      },
      clearPendingFeatureFocus: () => {
        set({ pendingFeatureFocus: undefined });
      },
      setHotkeyOverride: (hotkeyId: string, keys) => {
        persistence.setOverride(hotkeyId, { keys });
      },
      clearHotkeyOverride: (hotkeyId: string) => {
        persistence.clearOverride(hotkeyId);
      },
    }),
  });
