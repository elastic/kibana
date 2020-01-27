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

import editorTemplate from './editor/editor.html';
import visualizeListingTemplate from './listing/visualize_listing.html';

import { initVisualizeAppDirective } from './visualize_app';
import { VisualizeConstants } from './visualize_constants';
import { VisualizeListingController } from './listing/visualize_listing';
import {
  ensureDefaultIndexPattern,
  registerTimefilterWithGlobalStateFactory,
} from './legacy_imports';
import { syncOnMount } from './global_state_sync';

import {
  getLandingBreadcrumbs,
  getWizardStep1Breadcrumbs,
  getCreateBreadcrumbs,
  getEditBreadcrumbs,
} from './breadcrumbs';

export function initVisualizeApp(app, deps) {
  initVisualizeAppDirective(app, deps);

  app.run(globalState => {
    syncOnMount(globalState, deps.data);
  });

  app.run((globalState, $rootScope) => {
    registerTimefilterWithGlobalStateFactory(
      deps.data.query.timefilter.timefilter,
      globalState,
      $rootScope
    );
  });

  app.config(function($routeProvider) {
    const defaults = {
      reloadOnSearch: false,
      requireUICapability: 'visualize.show',
      badge: () => {
        if (deps.visualizeCapabilities.save) {
          return undefined;
        }

        return {
          text: i18n.translate('kbn.visualize.badge.readOnly.text', {
            defaultMessage: 'Read only',
          }),
          tooltip: i18n.translate('kbn.visualize.badge.readOnly.tooltip', {
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
          hasDefaultIndex: ($rootScope, kbnUrl) =>
            ensureDefaultIndexPattern(deps.core, deps.data, $rootScope, kbnUrl),
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
          hasDefaultIndex: ($rootScope, kbnUrl) =>
            ensureDefaultIndexPattern(deps.core, deps.data, $rootScope, kbnUrl),
        },
      })
      .when(VisualizeConstants.CREATE_PATH, {
        ...defaults,
        template: editorTemplate,
        k7Breadcrumbs: getCreateBreadcrumbs,
        resolve: {
          savedVis: function(redirectWhenMissing, $route, $rootScope, kbnUrl) {
            const { core, data, savedVisualizations, visualizations } = deps;
            const visTypes = visualizations.types.all();
            const visType = find(visTypes, { name: $route.current.params.type });
            const shouldHaveIndex = visType.requiresSearch && visType.options.showIndexSelection;
            const hasIndex =
              $route.current.params.indexPattern || $route.current.params.savedSearchId;
            if (shouldHaveIndex && !hasIndex) {
              throw new Error(
                i18n.translate(
                  'kbn.visualize.createVisualization.noIndexPatternOrSavedSearchIdErrorMessage',
                  {
                    defaultMessage: 'You must provide either an indexPattern or a savedSearchId',
                  }
                )
              );
            }

            return ensureDefaultIndexPattern(core, data, $rootScope, kbnUrl)
              .then(() => savedVisualizations.get($route.current.params))
              .then(savedVis => {
                if (savedVis.vis.type.setup) {
                  return savedVis.vis.type.setup(savedVis).catch(() => savedVis);
                }
                return savedVis;
              })
              .catch(
                redirectWhenMissing({
                  '*': '/visualize',
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
          savedVis: function(redirectWhenMissing, $route, $rootScope, kbnUrl) {
            const { chrome, core, data, savedVisualizations } = deps;
            return ensureDefaultIndexPattern(core, data, $rootScope, kbnUrl)
              .then(() => savedVisualizations.get($route.current.params.id))
              .then(savedVis => {
                chrome.recentlyAccessed.add(savedVis.getFullPath(), savedVis.title, savedVis.id);
                return savedVis;
              })
              .then(savedVis => {
                if (savedVis.vis.type.setup) {
                  return savedVis.vis.type.setup(savedVis).catch(() => savedVis);
                }
                return savedVis;
              })
              .catch(
                redirectWhenMissing({
                  visualization: '/visualize',
                  search:
                    '/management/kibana/objects/savedVisualizations/' + $route.current.params.id,
                  'index-pattern':
                    '/management/kibana/objects/savedVisualizations/' + $route.current.params.id,
                  'index-pattern-field':
                    '/management/kibana/objects/savedVisualizations/' + $route.current.params.id,
                })
              );
          },
        },
      })
      .when(`visualize/:tail*?`, {
        redirectTo: `/${deps.core.injectedMetadata.getInjectedVar('kbnDefaultAppId')}`,
      });
  });
}
