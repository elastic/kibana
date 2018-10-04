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

import './home.less';
import chrome from 'ui/chrome';
import routes from 'ui/routes';
import template from './home_ng_wrapper.html';
import { FeatureCatalogueRegistryProvider } from 'ui/registry/feature_catalogue';
import { uiModules } from 'ui/modules';
import {
  HomeApp
} from './components/home_app';
import { recentlyAccessed } from 'ui/persisted_log';

const app = uiModules.get('apps/home', []);
app.directive('homeApp', function (reactDirective) {
  return reactDirective(HomeApp);
});

function getRoute() {
  return {
    template,
    controller($scope, config, indexPatterns, Private) {
      $scope.addBasePath = chrome.addBasePath;
      $scope.directories = Private(FeatureCatalogueRegistryProvider).inTitleOrder;
      $scope.recentlyAccessed = recentlyAccessed.get().map(item => {
        item.link = chrome.addBasePath(item.link);
        return item;
      });
    }
  };
}

// All routing will be handled inside HomeApp via react, we just need to make sure angular doesn't
// redirect us to the default page by encountering a url it isn't marked as being able to handle.
routes.when('/home', getRoute());
routes.when('/home/feature_directory', getRoute());
routes.when('/home/tutorial_directory/:tab?', getRoute());
routes.when('/home/tutorial/:id', getRoute());
