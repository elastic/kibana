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

import {
  createKbnUrlStateStorage,
  redirectWhenMissing,
  ensureDefaultIndexPattern,
} from '../../../../../../plugins/kibana_utils/public';

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

export function initVisualizeApp(app, deps) {
  initVisualizeAppDirective(app, deps);

  app.factory('history', () => createHashHistory());
  app.factory('kbnUrlStateStorage', history =>
    createKbnUrlStateStorage({
      history,
      useHash: deps.uiSettings.get('state:storeInSessionStorage'),
    })
  );

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
          hasDefaultIndex: history => ensureDefaultIndexPattern(deps.core, deps.data, history),
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
          hasDefaultIndex: history => ensureDefaultIndexPattern(deps.core, deps.data, history),
        },
      })
      .when(VisualizeConstants.CREATE_PATH, {
        ...defaults,
        template: editorTemplate,
        k7Breadcrumbs: getCreateBreadcrumbs,
        resolve: {
          savedVis: function($route, history) {
            const { core, data, savedVisualizations, visualizations, toastNotifications } = deps;
            const visTypes = visualizations.all();
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

            return ensureDefaultIndexPattern(core, data, history)
              .then(() => savedVisualizations.get($route.current.params))
              .then(savedVis => {
                if (savedVis.vis.type.setup) {
                  return savedVis.vis.type.setup(savedVis).catch(() => savedVis);
                }
                return savedVis;
              })
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
          savedVis: function($route, history) {
            const { chrome, core, data, savedVisualizations, toastNotifications } = deps;
            return ensureDefaultIndexPattern(core, data, history)
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
                  history,
                  mapping: {
                    visualization: VisualizeConstants.LANDING_PAGE_PATH,
                    search:
                      '/management/kibana/objects/savedVisualizations/' + $route.current.params.id,
                    'index-pattern':
                      '/management/kibana/objects/savedVisualizations/' + $route.current.params.id,
                    'index-pattern-field':
                      '/management/kibana/objects/savedVisualizations/' + $route.current.params.id,
                  },
                  toastNotifications,
                })
              );
          },
        },
      })
      .when(`visualize/:tail*?`, {
        redirectTo: `/${deps.config.defaultAppId}`,
      });
  });
}
