/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { once } from 'lodash';
import { BehaviorSubject } from 'rxjs';
import { createHashHistory } from 'history';
import type { ScopedHistory, AppMountParameters } from '@kbn/core/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { createGetterSetter } from '@kbn/kibana-utils-plugin/public';
import { DiscoverServices, HistoryLocationState } from './build_services';

let moduleServices: DiscoverServices;
const servicesReady$ = new BehaviorSubject(false);
export const untilPluginStartServicesReady = () => {
  if (servicesReady$.value) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const subscription = servicesReady$.subscribe((isInitialized) => {
      if (isInitialized) {
        subscription.unsubscribe();
        resolve();
      }
    });
  });
};

export const getModuleServices = async () => {
  await untilPluginStartServicesReady();
  return moduleServices;
};

export const setModuleServices = (servicesPromise: Promise<DiscoverServices>) => {
  servicesPromise.then((services) => {
    moduleServices = services;
    servicesReady$.next(true);
  });
};

let uiActions: UiActionsStart;
export interface UrlTracker {
  setTrackedUrl: (url: string) => void;
  restorePreviousUrl: () => void;
  setTrackingEnabled: (value: boolean) => void;
}

export const setUiActions = (pluginUiActions: UiActionsStart) => (uiActions = pluginUiActions);
export const getUiActions = () => uiActions;

export const [getHeaderActionMenuMounter, setHeaderActionMenuMounter] =
  createGetterSetter<AppMountParameters['setHeaderActionMenu']>('headerActionMenuMounter');

export const [getUrlTracker, setUrlTracker] = createGetterSetter<UrlTracker>('urlTracker');

/**
 * Makes sure discover and context are using one instance of history.
 */
export const getHistory = once(() => {
  const history = createHashHistory<HistoryLocationState>();
  history.listen(() => {
    // keep at least one listener so that `history.location` always in sync
  });
  return history;
});

/**
 * Discover currently uses two `history` instances: one from Kibana Platform and
 * another from `history` package. Below function is used every time Discover
 * app is loaded to synchronize both instances.
 *
 * This helper is temporary until https://github.com/elastic/kibana/issues/65161 is resolved.
 */
export const syncHistoryLocations = () => {
  const h = getHistory();
  Object.assign(h.location, createHashHistory().location);
  return h;
};

export const [getScopedHistory, setScopedHistory] =
  createGetterSetter<ScopedHistory>('scopedHistory');
