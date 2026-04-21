/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable, Subscription } from 'rxjs';
import type { AppScopedHotkeys, HotkeyDefinition, HotkeyHandle } from '@kbn/core-hotkeys-browser';

/**
 * @internal
 */
export interface CreateAppScopedHotkeysDeps {
  /** Delegated registrar from {@link HotkeysService}. */
  register: (def: HotkeyDefinition, handler: (event: KeyboardEvent) => void) => HotkeyHandle;
  /** Pinned app id passed by the caller, if any. */
  pinnedAppId?: string;
  /** Synchronous accessor for the latest `currentAppId$` emission. */
  resolveAppId: () => string | undefined;
  /** Stream of `currentAppId$` values, used to flush the buffer. */
  currentAppId$: Observable<string | undefined>;
}

type ScopedDef = Omit<HotkeyDefinition, 'appId' | 'scope'>;

interface DeferredHandle {
  readonly handle: HotkeyHandle;
  bind(real: HotkeyHandle): void;
}

const createDeferredHandle = (id: string): DeferredHandle => {
  let real: HotkeyHandle | undefined;
  let unregistered = false;
  const pendingUpdates: Array<Parameters<HotkeyHandle['update']>[0]> = [];

  return {
    handle: {
      id,
      update: (partial) => {
        if (real) {
          real.update(partial);
        } else {
          pendingUpdates.push(partial);
        }
      },
      unregister: () => {
        if (real) {
          real.unregister();
        } else {
          unregistered = true;
        }
      },
    },
    bind: (r) => {
      real = r;
      if (unregistered) {
        r.unregister();
        return;
      }
      for (const partial of pendingUpdates) {
        r.update(partial);
      }
      pendingUpdates.length = 0;
    },
  };
};

/**
 * Creates an {@link AppScopedHotkeys} instance bound to a single app. The
 * `appId` is resolved once, either from the explicit argument or from the
 * latest `currentAppId$` emission. If neither is available at creation time,
 * registrations are buffered and flushed as soon as `currentAppId$` emits a
 * defined value.
 *
 * @internal
 */
export const createAppScopedHotkeys = ({
  register,
  pinnedAppId,
  resolveAppId,
  currentAppId$,
}: CreateAppScopedHotkeysDeps): AppScopedHotkeys => {
  let resolvedAppId: string | undefined = pinnedAppId ?? resolveAppId();
  const handles = new Set<HotkeyHandle>();
  const buffer: Array<{
    def: ScopedDef;
    handler: (event: KeyboardEvent) => void;
    deferred: DeferredHandle;
  }> = [];
  let flushSub: Subscription | undefined;
  let disposed = false;

  const registerNow = (def: ScopedDef, handler: (event: KeyboardEvent) => void): HotkeyHandle => {
    const appId = resolvedAppId;
    const handle = register({ ...def, appId, scope: 'app' }, handler);
    handles.add(handle);
    return {
      id: handle.id,
      update: (partial) => handle.update(partial),
      unregister: () => {
        handle.unregister();
        handles.delete(handle);
      },
    };
  };

  const flushBuffer = () => {
    if (resolvedAppId === undefined || disposed) {
      return;
    }
    const pending = buffer.splice(0, buffer.length);
    for (const { def, handler, deferred } of pending) {
      const real = registerNow(def, handler);
      deferred.bind(real);
    }
  };

  if (resolvedAppId === undefined) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.warn(
        '[HotkeysService] forApp() called before `application.currentAppId$` emitted a defined value. Registrations will be buffered until the current app is known. Pass an explicit `appId` to forApp() or call it from within an app mount to avoid this warning.'
      );
    }
    flushSub = currentAppId$.subscribe((id) => {
      if (id === undefined || resolvedAppId !== undefined) {
        return;
      }
      resolvedAppId = id;
      flushSub?.unsubscribe();
      flushSub = undefined;
      flushBuffer();
    });
  }

  const registerInScope = (
    def: ScopedDef,
    handler: (event: KeyboardEvent) => void
  ): HotkeyHandle => {
    if (disposed) {
      throw new Error(
        `HotkeysService: cannot register "${def.id}" after the app scope has been disposed`
      );
    }
    if (resolvedAppId !== undefined) {
      return registerNow(def, handler);
    }
    const deferred = createDeferredHandle(def.id);
    buffer.push({ def, handler, deferred });
    return deferred.handle;
  };

  const registerMany: AppScopedHotkeys['registerMany'] = (defs) => {
    const registered = defs.map(({ def, handler }) => registerInScope(def, handler));
    return () => {
      for (const handle of registered) {
        handle.unregister();
      }
    };
  };

  const dispose = () => {
    if (disposed) {
      return;
    }
    disposed = true;
    flushSub?.unsubscribe();
    flushSub = undefined;
    buffer.length = 0;
    for (const handle of handles) {
      handle.unregister();
    }
    handles.clear();
  };

  return {
    register: registerInScope,
    registerMany,
    dispose,
  };
};
