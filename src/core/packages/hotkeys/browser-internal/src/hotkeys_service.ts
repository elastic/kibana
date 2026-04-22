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
import {
  createEmptyOverridesSource,
  type HotkeyOverride,
  type HotkeyOverridesSource,
} from './overrides_source';

/** @internal */
export type SetupDeps = Record<string, never>;

/** @internal */
export interface StartDeps {
  application: Pick<ApplicationStart, 'currentAppId$'>;
  /**
   * Optional source of user hotkey overrides. When omitted the service
   * uses an empty source and every registration runs with its declared
   * binding. Platform callers wire a real implementation once override
   * storage is available.
   */
  overrides?: HotkeyOverridesSource;
}

/**
 * Internal bookkeeping for a single registered hotkey. Tracks both the
 * declaration the caller provided and the last-applied resolved binding
 * (chord + enabled) so the service can reconcile cheaply when overrides
 * change without re-registering unchanged entries.
 */
interface InternalEntry {
  def: HotkeyDefinition;
  callback: HotkeyCallback;
  managerHandle: HotkeyRegistrationHandle;
  lastResolvedKeys: HotkeyDefinition['keys'];
  lastResolvedEnabled: boolean;
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
 * Cheap structural comparison for {@link HotkeyDefinition.keys}. Works
 * for both string chords and `RawHotkey` objects without pulling in a
 * deep-equal dependency.
 */
const keysEqual = (a: HotkeyDefinition['keys'], b: HotkeyDefinition['keys']): boolean => {
  if (a === b) return true;
  return JSON.stringify(a) === JSON.stringify(b);
};

/**
 * Core browser-side hotkeys service. Wraps a shared `HotkeyManager` instance
 * from `@tanstack/hotkeys` and projects its live `registrations` store back
 * into the Kibana {@link HotkeyDefinition} shape consumed by discovery UIs
 * (cheat sheet, keyboard settings, etc.). An optional
 * {@link HotkeyOverridesSource} feeds user rebindings into the same
 * reconciliation path so declared bindings and persisted overrides are
 * merged in a single place.
 *
 * @internal
 */
export class HotkeysService {
  private readonly manager: HotkeyManager = HotkeyManager.getInstance();
  private readonly internal = new Map<string, InternalEntry>();
  private readonly subscriptions = new Subscription();
  private derived: DerivedRegistrations | undefined;
  private latestAppId: string | undefined;
  private latestOverrides: ReadonlyMap<string, HotkeyOverride> = new Map();
  private started = false;

  public setup(_deps: SetupDeps = {}): HotkeysSetup {
    return {};
  }

  public start({ application, overrides = createEmptyOverridesSource() }: StartDeps): HotkeysStart {
    this.started = true;
    this.derived = createDerivedRegistrations(this.manager);
    this.subscriptions.add(
      application.currentAppId$.subscribe((id) => {
        this.latestAppId = id;
      })
    );
    this.subscriptions.add(overrides.overrides$.subscribe((next) => this.applyOverrides(next)));

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
    this.latestOverrides = new Map();
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
    const override = this.latestOverrides.get(stored.id);
    const resolvedKeys = override?.keys ?? stored.keys;
    const resolvedEnabled = override?.enabled ?? stored.enabled !== false;
    const managerHandle = this.manager.register(resolvedKeys as RegisterableHotkey, callback, {
      enabled: resolvedEnabled,
      target: stored.target ?? undefined,
      meta: buildMeta(stored),
    });
    const entry: InternalEntry = {
      def: stored,
      callback,
      managerHandle,
      lastResolvedKeys: resolvedKeys,
      lastResolvedEnabled: resolvedEnabled,
    };
    this.internal.set(stored.id, entry);

    return {
      id: stored.id,
      update: (partial) => {
        const current = this.internal.get(stored.id);
        if (!current) {
          return;
        }
        current.def = { ...current.def, ...partial };
        this.rebindEntry(current);
      },
      unregister: () => {
        const current = this.internal.get(stored.id);
        if (!current) {
          return;
        }
        current.managerHandle.unregister();
        this.internal.delete(stored.id);
      },
    };
  }

  private applyOverrides(next: ReadonlyMap<string, HotkeyOverride>): void {
    const previous = this.latestOverrides;
    this.latestOverrides = next;
    if (this.internal.size === 0) {
      return;
    }
    for (const entry of this.internal.values()) {
      const prev = previous.get(entry.def.id);
      const curr = next.get(entry.def.id);
      if (prev === curr) {
        continue;
      }
      this.rebindEntry(entry);
    }
  }

  /**
   * Reconciles the TanStack registration for a single entry against the
   * current declaration and override. Falls back to `setOptions` when the
   * chord is unchanged (cheap path that preserves the existing handle),
   * and re-registers via the manager when the chord differs so the
   * underlying key listener routes the new chord.
   */
  private rebindEntry(entry: InternalEntry): void {
    const override = this.latestOverrides.get(entry.def.id);
    const resolvedKeys = override?.keys ?? entry.def.keys;
    const resolvedEnabled = override?.enabled ?? entry.def.enabled !== false;
    const meta = buildMeta(entry.def);

    if (keysEqual(entry.lastResolvedKeys, resolvedKeys)) {
      entry.managerHandle.setOptions({ enabled: resolvedEnabled, meta });
    } else {
      entry.managerHandle.unregister();
      entry.managerHandle = this.manager.register(
        resolvedKeys as RegisterableHotkey,
        entry.callback,
        {
          enabled: resolvedEnabled,
          target: entry.def.target ?? undefined,
          meta,
        }
      );
    }
    entry.lastResolvedKeys = resolvedKeys;
    entry.lastResolvedEnabled = resolvedEnabled;
  }
}

/** @internal */
export type HotkeysServiceContract = PublicMethodsOf<HotkeysService>;
