/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createHashHistory } from 'history';
import _ from 'lodash';
import { ScopedHistory } from '../../../core/public/application/scoped_history';
import type { AppMountParameters } from '../../../core/public/application/types';
import { search } from '../../data/public';
import { createGetterSetter } from '../../kibana_utils/common/create_getter_setter';
import type { UiActionsStart } from '../../ui_actions/public/plugin';
import { DocViewsRegistry } from './application/doc_views/doc_views_registry';
import type { DiscoverServices } from './build_services';

let angularModule: ng.IModule | null = null;
let services: DiscoverServices | null = null;
let uiActions: UiActionsStart;

/**
 * set bootstrapped inner angular module
 */
export function setAngularModule(module: ng.IModule) {
  angularModule = module;
}

/**
 * get boostrapped inner angular module
 */
export function getAngularModule(): ng.IModule {
  if (!angularModule) {
    throw new Error('Discover angular module not yet available');
  }
  return angularModule;
}

export function getServices(): DiscoverServices {
  if (!services) {
    throw new Error('Discover services are not yet available');
  }
  return services;
}

export function setServices(newServices: DiscoverServices) {
  services = newServices;
}

export const setUiActions = (pluginUiActions: UiActionsStart) => (uiActions = pluginUiActions);
export const getUiActions = () => uiActions;

export const [getHeaderActionMenuMounter, setHeaderActionMenuMounter] = createGetterSetter<
  AppMountParameters['setHeaderActionMenu']
>('headerActionMenuMounter');

export const [getUrlTracker, setUrlTracker] = createGetterSetter<{
  setTrackedUrl: (url: string) => void;
  restorePreviousUrl: () => void;
}>('urlTracker');

export const [getDocViewsRegistry, setDocViewsRegistry] = createGetterSetter<DocViewsRegistry>(
  'DocViewsRegistry'
);

/**
 * Makes sure discover and context are using one instance of history.
 */
export const getHistory = _.once(() => {
  const history = createHashHistory();
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

export const [getScopedHistory, setScopedHistory] = createGetterSetter<ScopedHistory>(
  'scopedHistory'
);

export const { tabifyAggResponse } = search;
// EXPORT types
export {
  EsQuerySortValue,
  IndexPattern,
  IndexPatternField,
  indexPatterns,
  IndexPatternsContract,
  ISearchSource,
  SortDirection,
} from '../../data/public';
export { formatMsg, formatStack, subscribeWithScope } from '../../kibana_legacy/public';
export { redirectWhenMissing, unhashUrl } from '../../kibana_utils/public';
