/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AppMountParameters, AppUnmount, CoreStart } from '@kbn/core/public';
import { DISCOVER_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import type { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import { getEuiThemeVars } from '@kbn/ui-theme';
import { PLUGIN_NAME } from '../common';
import { TrailblazerApi } from './api';
import type { TrailContext } from './context';
import { h } from './dom';
import { ClusterPane } from './panes/cluster_pane';
import { DocumentPane } from './panes/document_pane';
import { FieldPane } from './panes/field_pane';
import { IndexListPane } from './panes/index_list_pane';
import { IndexPane } from './panes/index_pane';
import { SavedObjectPane } from './panes/saved_object_pane';
import { SavedObjectTypesPane } from './panes/saved_object_types_pane';
import { SavedObjectsPane } from './panes/saved_objects_pane';
import type { StartDeps } from './plugin';
import { Preferences } from './preferences';
import { applyThemeVars, styles } from './styles';
import { Trail } from './trail';
import type { TrailStep } from './trail_state';
import { decodeTrail, encodeTrail, restoreTrail, TRAIL_URL_PARAM } from './trail_state';

/** Renders the Trailblazer application into `element` and returns its unmount function. */
export function mountApp(
  core: CoreStart,
  { share }: StartDeps,
  { element, history }: AppMountParameters
): AppUnmount {
  core.chrome.docTitle.change(PLUGIN_NAME);

  const crumbsEl = h('nav', { className: styles.crumbs, attrs: { 'aria-label': 'Trail' } });
  const trailEl = h('main', { className: styles.trail });
  const root = h('div', { className: styles.root, attrs: { 'data-test-subj': 'trailblazerApp' } }, [
    h('div', { className: styles.toolbar }, [
      h('div', { className: styles.brand }, [
        h('span', { className: styles.brandMark, attrs: { 'aria-hidden': 'true' } }, [
          h('span'),
          h('span'),
          h('span'),
        ]),
        PLUGIN_NAME,
      ]),
      crumbsEl,
    ]),
    trailEl,
  ]);

  const themeSubscription = core.theme.theme$.subscribe((theme) =>
    applyThemeVars(root, getEuiThemeVars(theme))
  );

  const savedSteps = decodeTrail(new URLSearchParams(history.location.search).get(TRAIL_URL_PARAM));
  const trail = new Trail(trailEl, crumbsEl, writeTrailToUrl);
  const ctx: TrailContext = {
    api: new TrailblazerApi(core.http),
    trail,
    preferences: new Preferences(window.localStorage),
    discover: share?.url.locators.get<DiscoverAppLocatorParams>(DISCOVER_APP_LOCATOR),
    openIndexList(parent, kind) {
      return trail.open(parent, new IndexListPane(ctx, kind));
    },
    openIndex(parent, search) {
      return trail.open(parent, new IndexPane(ctx, search));
    },
    openDocument(parent, args) {
      return trail.open(parent, new DocumentPane(ctx, args));
    },
    openField(parent, args) {
      return trail.open(parent, new FieldPane(ctx, args));
    },
    openSavedObjectTypes(parent) {
      return trail.open(parent, new SavedObjectTypesPane(ctx));
    },
    openSavedObjects(parent, type) {
      return trail.open(parent, new SavedObjectsPane(ctx, type));
    },
    openSavedObject(parent, target) {
      return trail.open(parent, new SavedObjectPane(ctx, target));
    },
  };

  function writeTrailToUrl(steps: TrailStep[]) {
    const params = new URLSearchParams(history.location.search);
    if (steps.length > 0) params.set(TRAIL_URL_PARAM, encodeTrail(steps));
    else params.delete(TRAIL_URL_PARAM);
    const search = params.toString();
    if (search === history.location.search.replace(/^\?/, '')) return;
    history.replace({ ...history.location, search: search ? `?${search}` : '' });
  }

  element.append(root);
  const clusterPane = new ClusterPane(ctx);
  trail.setRoot(clusterPane);
  clusterPane.focus();

  const restoreController = new AbortController();
  restoreTrail(ctx, clusterPane, savedSteps, restoreController.signal);

  return function unmount() {
    restoreController.abort();
    themeSubscription.unsubscribe();
    trail.destroy();
    core.chrome.docTitle.reset();
    root.remove();
  };
}
