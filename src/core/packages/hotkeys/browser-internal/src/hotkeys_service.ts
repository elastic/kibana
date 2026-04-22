/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Subscription } from 'rxjs';
import { HotkeyManager, type HotkeyCallback, type RegisterableHotkey } from '@tanstack/hotkeys';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type {
  AppScopedHotkeys,
  HotkeyDefinition,
  HotkeyHandle,
  HotkeysSetup,
  HotkeysStart,
} from '@kbn/core-hotkeys-browser';
import { RegistrationsStore } from './registrations_store';
import { createAppScopedHotkeys } from './app_scoped_hotkeys';

/** @internal */
export type SetupDeps = Record<string, never>;

/** @internal */
export interface StartDeps {
  application: Pick<ApplicationStart, 'currentAppId$'>;
}

const buildMeta = (def: HotkeyDefinition) => ({
  kibana: {
    id: def.id,
    label: def.label,
    description: def.description,
    scope: def.scope ?? 'context',
    appId: def.appId,
    group: def.group,
  },
});

/**
 * Core browser-side hotkeys service. Wraps a shared `HotkeyManager` instance
 * from `@tanstack/hotkeys` with a Kibana-flavored registry that exposes a
 * discoverable stream of definitions and an app-scoped registrar.
 *
 * @internal
 */
export class HotkeysService {
  private readonly manager: HotkeyManager = HotkeyManager.getInstance();
  private readonly registrations = new RegistrationsStore();
  private readonly subscriptions = new Subscription();
  private latestAppId: string | undefined;
  private started = false;

  public setup(_deps: SetupDeps = {}): HotkeysSetup {
    return {};
  }

  public start({ application }: StartDeps): HotkeysStart {
    this.started = true;
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
      this.registrations.asObservable();

    return { register, registerMany, forApp, getRegistrations$ };
  }

  public stop() {
    if (!this.started) {
      return;
    }
    this.started = false;
    this.subscriptions.unsubscribe();
    this.registrations.dispose();
    this.manager.destroy();
  }

  private doRegister(def: HotkeyDefinition, handler: (event: KeyboardEvent) => void): HotkeyHandle {
    if (this.registrations.has(def.id)) {
      throw new Error(`HotkeysService: a hotkey with id "${def.id}" is already registered`);
    }
    const stored: HotkeyDefinition = { ...def, scope: def.scope ?? 'context' };
    const callback: HotkeyCallback = (event) => handler(event);
    const managerHandle = this.manager.register(stored.keys as RegisterableHotkey, callback, {
      enabled: stored.enabled !== false,
      target: stored.target ?? undefined,
      meta: buildMeta(stored),
    });
    this.registrations.set(stored);

    return {
      id: stored.id,
      update: (partial) => {
        const current = this.registrations.get(stored.id);
        if (!current) {
          return;
        }
        const next: HotkeyDefinition = { ...current, ...partial };
        this.registrations.set(next);
        const options: Parameters<typeof managerHandle.setOptions>[0] = {
          meta: buildMeta(next),
        };
        if (partial.enabled !== undefined) {
          options.enabled = partial.enabled !== false;
        }
        managerHandle.setOptions(options);
      },
      unregister: () => {
        if (!this.registrations.has(stored.id)) {
          return;
        }
        managerHandle.unregister();
        this.registrations.remove(stored.id);
      },
    };
  }
}

/** @internal */
export type HotkeysServiceContract = PublicMethodsOf<HotkeysService>;
