/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { find } from 'lodash';
import { i18n } from '@kbn/i18n';
import { createHashHistory } from 'history';

import { createKbnUrlStateStorage, redirectWhenMissing } from '../../../kibana_utils/public';
import { createSavedSearchesLoader } from '../../../discover/public';

import editorTemplate from './editor/editor.html';
import visualizeListingTemplate from './listing/visualize_listing.html';

import { initVisualizeAppDirective } from './visualize_app';
import { VisualizeConstants } from './visualize_constants';
import { VisualizeListingController } from './listing/visualize_listing';

import {
  getLandingBreadcrumbs,
  getWizardStep1Breadcrumbs,
  getCreateBreadcrumbs,
  getEditBreadcrumbs,
} from './breadcrumbs';

const getResolvedResults = (deps) => {
  const { core, data, visualizations, createVisEmbeddableFromObject } = deps;

  const results = {};

  return (savedVis) => {
    results.savedVis = savedVis;
    const serializedVis = visualizations.convertToSerializedVis(savedVis);
    return visualizations
      .createVis(serializedVis.type, serializedVis)
      .then((vis) => {
        if (vis.type.setup) {
          return vis.type.setup(vis).catch(() => vis);
        }
        return vis;
      })
      .then((vis) => {
        results.vis = vis;
        return createVisEmbeddableFromObject(vis, {
          timeRange: data.query.timefilter.timefilter.getTime(),
          filters: data.query.filterManager.getFilters(),
        });
      })
      .then((embeddableHandler) => {
        results.embeddableHandler = embeddableHandler;

        embeddableHandler.getOutput$().subscribe((output) => {
          if (output.error) {
            core.notifications.toasts.addError(output.error, {
              title: i18n.translate('visualize.error.title', {
                defaultMessage: 'Visualization error',
              }),
            });
          }
        });

        if (results.vis.data.savedSearchId) {
          return createSavedSearchesLoader({
            savedObjectsClient: core.savedObjects.client,
            indexPatterns: data.indexPatterns,
            search: data.search,
            chrome: core.chrome,
            overlays: core.overlays,
          }).get(results.vis.data.savedSearchId);
        }
      })
      .then((savedSearch) => {
        if (savedSearch) {
          results.savedSearch = savedSearch;
        }
        return results;
      });
  };
};

export function initVisualizeApp(app, deps) {
  initVisualizeAppDirective(app, deps);

  app.factory('history', () => createHashHistory());
  app.factory('kbnUrlStateStorage', (history) =>
    createKbnUrlStateStorage({
      history,
      useHash: deps.core.uiSettings.get('state:storeInSessionStorage'),
    })
  );

  app.config(function ($routeProvider) {
    const defaults = {
      reloadOnSearch: false,
      requireUICapability: 'visualize.show',
      badge: () => {
        if (deps.visualizeCapabilities.save) {
          return undefined;
        }

        return {
          text: i18n.translate('visualize.badge.readOnly.text', {
            defaultMessage: 'Read only',
          }),
          tooltip: i18n.translate('visualize.badge.readOnly.tooltip', {
            defaultMessage: 'Unable to save visualizations',
          }),
          iconType: 'glasses',
        };
      },
    };

    $routeProvider
      .when(VisualizeConstants.LANDING_PAGE_PATH, {
        ...defaults,
        template: visualizeListingTemplate,
        k7Breadcrumbs: getLandingBreadcrumbs,
        controller: VisualizeListingController,
        controllerAs: 'listingController',
        resolve: {
          createNewVis: () => false,
          hasDefaultIndex: (history) => deps.data.indexPatterns.ensureDefaultIndexPattern(history),
        },
      })
      .when(VisualizeConstants.WIZARD_STEP_1_PAGE_PATH, {
        ...defaults,
        template: visualizeListingTemplate,
        k7Breadcrumbs: getWizardStep1Breadcrumbs,
        controller: VisualizeListingController,
        controllerAs: 'listingController',
        resolve: {
          createNewVis: () => true,
          hasDefaultIndex: (history) => deps.data.indexPatterns.ensureDefaultIndexPattern(history),
        },
      })
      .when(VisualizeConstants.CREATE_PATH, {
        ...defaults,
        template: editorTemplate,
        k7Breadcrumbs: getCreateBreadcrumbs,
        resolve: {
          resolved: function ($route, history) {
            const { data, savedVisualizations, visualizations, toastNotifications } = deps;
            const visTypes = visualizations.all();
            const visType = find(visTypes, { name: $route.current.params.type });
            const shouldHaveIndex = visType.requiresSearch && visType.options.showIndexSelection;
            const hasIndex =
              $route.current.params.indexPattern || $route.current.params.savedSearchId;
            if (shouldHaveIndex && !hasIndex) {
              throw new Error(
                i18n.translate(
                  'visualize.createVisualization.noIndexPatternOrSavedSearchIdErrorMessage',
                  {
                    defaultMessage: 'You must provide either an indexPattern or a savedSearchId',
                  }
                )
              );
            }

            // This delay is needed to prevent some navigation issues in Firefox/Safari.
            // see https://github.com/elastic/kibana/issues/65161
            const delay = (res) => {
              return new Promise((resolve) => {
                setTimeout(() => resolve(res), 0);
              });
            };

            return data.indexPatterns
              .ensureDefaultIndexPattern(history)
              .then(() => savedVisualizations.get($route.current.params))
              .then((savedVis) => {
                savedVis.searchSourceFields = { index: $route.current.params.indexPattern };
                return savedVis;
              })
              .then(getResolvedResults(deps))
              .then(delay)
              .catch(
                redirectWhenMissing({
                  history,
                  mapping: VisualizeConstants.LANDING_PAGE_PATH,
                  toastNotifications,
                })
              );
          },
        },
      })
      .when(`${VisualizeConstants.EDIT_PATH}/:id`, {
        ...defaults,
        template: editorTemplate,
        k7Breadcrumbs: getEditBreadcrumbs,
        resolve: {
          resolved: function ($route, history) {
            const { chrome, data, savedVisualizations, toastNotifications } = deps;

            return data.indexPatterns
              .ensureDefaultIndexPattern(history)
              .then(() => savedVisualizations.get($route.current.params.id))
              .then((savedVis) => {
                chrome.recentlyAccessed.add(savedVis.getFullPath(), savedVis.title, savedVis.id);
                return savedVis;
              })
              .then(getResolvedResults(deps))
              .catch(
                redirectWhenMissing({
                  history,
                  navigateToApp: deps.core.application.navigateToApp,
                  basePath: deps.core.http.basePath,
                  mapping: {
                    visualization: VisualizeConstants.LANDING_PAGE_PATH,
                    search: {
                      app: 'management',
                      path: 'kibana/objects/savedVisualizations/' + $route.current.params.id,
                    },
                    'index-pattern': {
                      app: 'management',
                      path: 'kibana/objects/savedVisualizations/' + $route.current.params.id,
                    },
                    'index-pattern-field': {
                      app: 'management',
                      path: 'kibana/objects/savedVisualizations/' + $route.current.params.id,
                    },
                  },
                  toastNotifications,
                  onBeforeRedirect() {
                    deps.setActiveUrl(VisualizeConstants.LANDING_PAGE_PATH);
                  },
                })
              );
          },
        },
      })
      .otherwise({
        template: '<span></span>',
        controller: function () {
          deps.kibanaLegacy.navigateToDefaultApp();
        },
      });
  });
}
