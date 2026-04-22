/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EMPTY, Subscription } from 'rxjs';
import {
  HotkeyManager,
  type HotkeyCallback,
  type HotkeyRegistrationHandle,
  type RegisterableHotkey,
} from '@tanstack/hotkeys';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type {
  AppScopedHotkeys,
  HotkeyDefinition,
  HotkeyHandle,
  HotkeysSetup,
  HotkeysStart,
} from '@kbn/core-hotkeys-browser';
import { createAppScopedHotkeys } from './app_scoped_hotkeys';
import { createDerivedRegistrations, type DerivedRegistrations } from './derive_registrations';

/** @internal */
export type SetupDeps = Record<string, never>;

/** @internal */
export interface StartDeps {
  application: Pick<ApplicationStart, 'currentAppId$'>;
}

/**
 * Internal bookkeeping for a single registered hotkey. Holds the
 * definition the caller provided (plus normalized defaults) and the
 * TanStack handle that backs it, so `update()` and future re-bind paths
 * can act on both without having to re-query the manager.
 */
interface InternalEntry {
  def: HotkeyDefinition;
  callback: HotkeyCallback;
  managerHandle: HotkeyRegistrationHandle;
}

const buildMeta = (def: HotkeyDefinition) => ({
  kibana: {
    id: def.id,
    label: def.label,
    description: def.description,
    scope: def.scope ?? 'context',
    appId: def.appId,
    group: def.group,
    defaultKeys: def.defaultKeys ?? def.keys,
  },
});

/**
 * Core browser-side hotkeys service. Wraps a shared `HotkeyManager` instance
 * from `@tanstack/hotkeys` and projects its live `registrations` store back
 * into the Kibana {@link HotkeyDefinition} shape consumed by discovery UIs
 * (cheat sheet, keyboard settings, etc.). The manager is the single source
 * of truth; this service only keeps a small lookup map so it can honor
 * `update()`/`unregister()` without duplicating the registry.
 *
 * @internal
 */
export class HotkeysService {
  private readonly manager: HotkeyManager = HotkeyManager.getInstance();
  private readonly internal = new Map<string, InternalEntry>();
  private readonly subscriptions = new Subscription();
  private derived: DerivedRegistrations | undefined;
  private latestAppId: string | undefined;
  private started = false;

  public setup(_deps: SetupDeps = {}): HotkeysSetup {
    return {};
  }

  public start({ application }: StartDeps): HotkeysStart {
    this.started = true;
    this.derived = createDerivedRegistrations(this.manager);
    this.subscriptions.add(
      application.currentAppId$.subscribe((id) => {
        this.latestAppId = id;
      })
    );

    const register: HotkeysStart['register'] = (def, handler) => this.doRegister(def, handler);

    const registerMany: HotkeysStart['registerMany'] = (defs) => {
      const handles = defs.map(({ def, handler }) => register(def, handler));
      return () => {
        for (const handle of handles) {
          handle.unregister();
        }
      };
    };

    const forApp: HotkeysStart['forApp'] = (appId?: string): AppScopedHotkeys =>
      createAppScopedHotkeys({
        register,
        pinnedAppId: appId,
        resolveAppId: () => this.latestAppId,
        currentAppId$: application.currentAppId$,
      });

    const getRegistrations$: HotkeysStart['getRegistrations$'] = () =>
      this.derived?.registrations$ ?? EMPTY;

    return { register, registerMany, forApp, getRegistrations$ };
  }

  public stop() {
    if (!this.started) {
      return;
    }
    this.started = false;
    this.subscriptions.unsubscribe();
    this.derived?.dispose();
    this.derived = undefined;
    this.internal.clear();
    this.manager.destroy();
  }

  private doRegister(def: HotkeyDefinition, handler: (event: KeyboardEvent) => void): HotkeyHandle {
    if (this.internal.has(def.id)) {
      throw new Error(`HotkeysService: a hotkey with id "${def.id}" is already registered`);
    }
    const stored: HotkeyDefinition = {
      ...def,
      scope: def.scope ?? 'context',
      defaultKeys: def.keys,
    };
    const callback: HotkeyCallback = (event) => handler(event);
    const managerHandle = this.manager.register(stored.keys as RegisterableHotkey, callback, {
      enabled: stored.enabled !== false,
      target: stored.target ?? undefined,
      meta: buildMeta(stored),
    });
    const entry: InternalEntry = { def: stored, callback, managerHandle };
    this.internal.set(stored.id, entry);

    return {
      id: stored.id,
      update: (partial) => {
        const current = this.internal.get(stored.id);
        if (!current) {
          return;
        }
        const next: HotkeyDefinition = { ...current.def, ...partial };
        current.def = next;
        const options: Parameters<typeof managerHandle.setOptions>[0] = {
          meta: buildMeta(next),
        };
        if (partial.enabled !== undefined) {
          options.enabled = partial.enabled !== false;
        }
        managerHandle.setOptions(options);
      },
      unregister: () => {
        if (!this.internal.has(stored.id)) {
          return;
        }
        managerHandle.unregister();
        this.internal.delete(stored.id);
      },
    };
  }
}

/** @internal */
export type HotkeysServiceContract = PublicMethodsOf<HotkeysService>;
