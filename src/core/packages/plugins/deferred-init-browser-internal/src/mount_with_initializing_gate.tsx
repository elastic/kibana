/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import ReactDOM from 'react-dom';
import type { Observable } from 'rxjs';
import { AppInitializingGate } from '@kbn/core-application-browser';
import type { AppMount, AppMountParameters, AppUnmount } from '@kbn/core-application-browser';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { DeferredInitStatus } from '@kbn/core-deferred-init-browser';

export interface MountWithInitializingGateDeps<HistoryLocationState = unknown> {
  /** The plugin whose deferred init this gate is waiting on. Shown in the failed-state message. */
  pluginId: string;
  /** The plugin's real app mount function, called once init is `available`. */
  mount: AppMount<HistoryLocationState>;
  status$: Observable<DeferredInitStatus>;
  onRetry: () => void;
  getStartServices: () => Promise<[CoreStart, unknown, unknown]>;
}

/**
 * Wraps a lazy plugin's app mount so it never runs until deferred init is `available`: renders
 * `<AppInitializingGate>` into the app's element while waiting, then swaps it out for the real
 * app once ready. `status$` never re-emits after `available` (it's terminal), so the gate is
 * only ever shown once, before the real app takes over the element for good.
 *
 * @internal
 */
export function mountWithInitializingGate<HistoryLocationState = unknown>({
  pluginId,
  mount,
  status$,
  onRetry,
  getStartServices,
}: MountWithInitializingGateDeps<HistoryLocationState>): AppMount<HistoryLocationState> {
  return async (params: AppMountParameters<HistoryLocationState>) => {
    const [{ rendering }] = await getStartServices();

    let cancelled = false;
    let mounted = false;
    let realUnmount: AppUnmount | undefined;

    const renderGate = ({ status, error, attempts }: DeferredInitStatus) => {
      ReactDOM.render(
        rendering.addContext(
          <AppInitializingGate
            status={status}
            pluginId={pluginId}
            error={error}
            attempts={attempts}
            onRetry={onRetry}
          >
            {null}
          </AppInitializingGate>
        ),
        params.element
      );
    };
    renderGate({ status: 'idle' });

    const subscription = status$.subscribe((current) => {
      if (cancelled || mounted) {
        return;
      }
      if (current.status !== 'available') {
        renderGate(current);
        return;
      }
      mounted = true;
      ReactDOM.unmountComponentAtNode(params.element);
      Promise.resolve(mount(params)).then((unmountFn) => {
        if (cancelled) {
          unmountFn();
        } else {
          realUnmount = unmountFn;
        }
      });
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      if (realUnmount) {
        realUnmount();
      } else if (!mounted) {
        ReactDOM.unmountComponentAtNode(params.element);
      }
    };
  };
}
