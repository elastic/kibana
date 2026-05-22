/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { bufferToggle, filter, Subject, type Observable, Subscription } from 'rxjs';
import type { AppScopedHotkeys, HotkeyDefinition, HotkeyHandle } from '@kbn/core-hotkeys-browser';

/**
 * @internal
 */
export interface CreateAppScopedHotkeysDeps {
  /** Delegated registrar from {@link HotkeysService}. */
  register: (def: HotkeyDefinition, handler: (event: KeyboardEvent) => void) => HotkeyHandle;
  /** Pinned app id passed by the caller, if any. */
  pinnedAppId?: string;
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
  currentAppId$,
}: CreateAppScopedHotkeysDeps): AppScopedHotkeys => {
  let currentAppIdValue: string;
  const handles = new Set<HotkeyHandle>();
  const subscriptions = new Subscription();
  const deferredRegistrations$ = new Subject<{
    def: ScopedDef;
    handler: (event: KeyboardEvent) => void;
    deferred: DeferredHandle;
  }>();

  const getResolvedAppId = () => pinnedAppId ?? currentAppIdValue;

  let disposed = false;

  subscriptions.add(
    currentAppId$.subscribe((id) => {
      if (id === undefined) {
        return;
      }
      currentAppIdValue = id;
    })
  );

  const on$ = currentAppId$.pipe(filter((id) => id !== undefined));
  const off$ = currentAppId$.pipe(filter((id) => id === undefined));

  // buffer the deferred registrations and flush them when the app id is resolved
  subscriptions.add(
    deferredRegistrations$.pipe(bufferToggle(off$, () => on$)).subscribe((pending) => {
      for (const { def, handler, deferred } of pending) {
        const real = registerNow(def, handler);
        deferred.bind(real);
      }
    })
  );

  const registerNow = (def: ScopedDef, handler: (event: KeyboardEvent) => void): HotkeyHandle => {
    const appId = getResolvedAppId();
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

  const registerInScope = (
    def: ScopedDef,
    handler: (event: KeyboardEvent) => void
  ): HotkeyHandle => {
    if (disposed) {
      throw new Error(
        `HotkeysService: cannot register "${def.id}" after the app scope has been disposed`
      );
    }

    if (getResolvedAppId() !== undefined) {
      return registerNow(def, handler);
    }

    const deferred = createDeferredHandle(def.id);
    deferredRegistrations$.next({ def, handler, deferred });
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

    subscriptions.unsubscribe();

    disposed = true;

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
