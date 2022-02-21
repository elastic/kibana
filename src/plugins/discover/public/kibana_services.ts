/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { once } from 'lodash';
import { createHashHistory } from 'history';
import type { ScopedHistory, AppMountParameters } from 'kibana/public';
import type { UiActionsStart } from 'src/plugins/ui_actions/public';
import { HistoryLocationState } from './build_services';
import { createGetterSetter } from '../../kibana_utils/public';
import { DocViewsRegistry } from './services/doc_views/doc_views_registry';

let uiActions: UiActionsStart;

export const setUiActions = (pluginUiActions: UiActionsStart) => (uiActions = pluginUiActions);
export const getUiActions = () => uiActions;

export const [getHeaderActionMenuMounter, setHeaderActionMenuMounter] =
  createGetterSetter<AppMountParameters['setHeaderActionMenu']>('headerActionMenuMounter');

export const [getUrlTracker, setUrlTracker] = createGetterSetter<{
  setTrackedUrl: (url: string) => void;
  restorePreviousUrl: () => void;
}>('urlTracker');

export const [getDocViewsRegistry, setDocViewsRegistry] =
  createGetterSetter<DocViewsRegistry>('DocViewsRegistry');

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
