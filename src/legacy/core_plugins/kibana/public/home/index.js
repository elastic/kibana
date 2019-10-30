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

import { getServices  } from './kibana_services';
import template from './home_ng_wrapper.html';
import {
  HomeApp
} from './components/home_app';
import { i18n } from '@kbn/i18n';

const { wrapInI18nContext, uiRoutes, uiModules  } = getServices();

const app = uiModules.get('apps/home', []);
app.directive('homeApp', function (reactDirective) {
  return reactDirective(wrapInI18nContext(HomeApp));
});

const homeTitle = i18n.translate('kbn.home.breadcrumbs.homeTitle', { defaultMessage: 'Home' });

function getRoute() {
  return {
    template,
    resolve: {
      directories: () => getServices().getFeatureCatalogueEntries()
    },
    controller($scope, $route) {
      const { chrome, addBasePath } = getServices();
      $scope.directories = $route.current.locals.directories;
      $scope.recentlyAccessed = chrome.recentlyAccessed.get().map(item => {
        item.link = addBasePath(item.link);
        return item;
      });
    },
    k7Breadcrumbs: () => [
      { text: homeTitle },
    ]
  };
}

// All routing will be handled inside HomeApp via react, we just need to make sure angular doesn't
// redirect us to the default page by encountering a url it isn't marked as being able to handle.
uiRoutes.when('/home', getRoute());
uiRoutes.when('/home/feature_directory', getRoute());
uiRoutes.when('/home/tutorial_directory/:tab?', getRoute());
uiRoutes.when('/home/tutorial/:id', getRoute());
