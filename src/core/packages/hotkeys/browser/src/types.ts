/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Hotkey, RegisterableHotkey } from '@tanstack/hotkeys';

/**
 * The tier a hotkey belongs to. Drives grouping in the cheat sheet.
 *
 * - `global`: active across the entire Kibana shell, independent of the current app.
 * - `app`: active while the user is in the owning Kibana application.
 * - `context`: active while a specific component/screen/overlay is mounted.
 *
 * @public
 */
export type HotkeyScope = 'global' | 'app' | 'context';

/**
 * Declaration of a Kibana-managed hotkey.
 *
 * @public
 */
export interface HotkeyDefinition {
  /** Stable, namespaced id (e.g. `discover:toggleSidebar`). Used for unregister and discovery grouping. */
  id: string;
  /**
   * The keyboard chord. Prefer the platform-adaptive `Mod` modifier for
   * cross-platform shortcuts. Accepts either a type-safe {@link Hotkey} string,
   * a {@link RegisterableHotkey} raw object for cases that don't fit the
   * strict union (e.g. `Shift+?`), or an arbitrary string for fully dynamic
   * registrations.
   *
   * On projected registrations from {@link HotkeysStart.getRegistrations$}
   * this is the chord that is currently bound (after any user override);
   * the originally declared value is preserved on {@link defaultKeys}.
   */
  keys: Hotkey | RegisterableHotkey | (string & {});
  /**
   * The originally declared chord. Stamped by the service at first register
   * and preserved across updates/overrides so discovery UIs can show both
   * the active binding and the shipped default.
   *
   * Plugins should not set this manually: it is auto-populated from `keys`
   * and any value passed at registration is ignored.
   */
  defaultKeys?: Hotkey | RegisterableHotkey | (string & {});
  /** Human-readable label, shown in the cheat sheet. Must be i18n-translated by the caller. */
  label: string;
  /** Optional longer description, shown alongside the label. Must be i18n-translated by the caller. */
  description?: string;
  /** Discovery tier. Defaults to `context` when omitted. */
  scope?: HotkeyScope;
  /** Owning application id. Auto-attached when registering via {@link AppScopedHotkeys}. */
  appId?: string;
  /**
   * Stable namespaced id for linking registrations to a product area (e.g. `discover:documentExplorer`).
   * Used for cheat-sheet filtering when the panel is opened via `openToFeature` on the hotkeys sidebar app; immutable after register.
   * Prefer {@link group} for human-readable headings (often i18n).
   *
   * @public
   */
  featureId?: string;
  /** Optional grouping key within a scope (e.g. `Navigation`, `Layout`). */
  group?: string;
  /** Soft-disable without unregistering. Defaults to `true`. */
  enabled?: boolean;
  /** DOM element/root to attach the listener to. Defaults to `document`. */
  target?: HTMLElement | Document | Window | null;
}

/**
 * Handle returned from {@link HotkeysStart.register}.
 *
 * @public
 */
export interface HotkeyHandle {
  /** Unique id from the originating {@link HotkeyDefinition}. */
  readonly id: string;
  /**
   * Update a subset of the definition without re-registering.
   * Useful to toggle `enabled` in response to capability/permission changes.
   */
  update(partial: Partial<Pick<HotkeyDefinition, 'enabled' | 'label' | 'description'>>): void;
  /** Unregister this hotkey. Safe to call multiple times. */
  unregister(): void;
}

/**
 * An app-scoped registrar created via {@link HotkeysStart.forApp}.
 *
 * @public
 */
export interface AppScopedHotkeys {
  /**
   * Register a hotkey pinned to this scope's `appId`.
   *
   * `scope` defaults to `'app'` and `appId` is injected automatically.
   */
  register(
    def: Omit<HotkeyDefinition, 'appId' | 'scope'>,
    handler: (event: KeyboardEvent) => void
  ): HotkeyHandle;
  /** Register multiple hotkeys at once. Returns a single dispose that unregisters all of them. */
  registerMany(
    defs: Array<{
      def: Omit<HotkeyDefinition, 'appId' | 'scope'>;
      handler: (event: KeyboardEvent) => void;
    }>
  ): () => void;
  /** Unregister every handle created through this scope. */
  dispose(): void;
}

declare module '@tanstack/hotkeys' {
  /**
   * Kibana-specific metadata attached to every hotkey registration so
   * {@link HotkeysStart.getRegistrations$} can project back to {@link HotkeyDefinition}.
   */
  interface HotkeyMeta {
    kibana?: {
      id: string;
      label: string;
      description?: string;
      scope: HotkeyScope;
      appId?: string;
      /** Optional; included when {@link HotkeyDefinition.featureId} was set at registration. */
      featureId?: string;
      group?: string;
      /**
       * The chord that was declared when the hotkey was first registered,
       * preserved here so discovery UIs can surface the shipped default
       * independently of any user override that may be active on
       * {@link HotkeyRegistration.hotkey}.
       */
      defaultKeys: Hotkey | RegisterableHotkey | (string & {});
    };
  }
}
