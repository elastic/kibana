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

import { management } from 'ui/management';
import './create_index_pattern_wizard';
import './edit_index_pattern';
import uiRoutes from 'ui/routes';
import { uiModules } from 'ui/modules';
import indexTemplate from './index.html';
import { SavedObjectsClientProvider } from 'ui/saved_objects';
import { FeatureCatalogueRegistryProvider, FeatureCatalogueCategory } from 'ui/registry/feature_catalogue';

const indexPatternsResolutions = {
  indexPatterns: function (Private) {
    const savedObjectsClient = Private(SavedObjectsClientProvider);

    return savedObjectsClient.find({
      type: 'index-pattern',
      fields: ['title'],
      perPage: 10000
    }).then(response => response.savedObjects);
  }
};

// add a dependency to all of the subsection routes
uiRoutes
  .defaults(/management\/kibana\/indices/, {
    resolve: indexPatternsResolutions
  });

uiRoutes
  .defaults(/management\/kibana\/index/, {
    resolve: indexPatternsResolutions
  });

// wrapper directive, which sets some global stuff up like the left nav
uiModules.get('apps/management')
  .directive('kbnManagementIndices', function ($route, config, kbnUrl) {
    return {
      restrict: 'E',
      transclude: true,
      template: indexTemplate,
      link: function ($scope) {
        $scope.editingId = $route.current.params.indexPatternId;
        config.bindToScope($scope, 'defaultIndex');

        $scope.$watch('defaultIndex', function () {
          $scope.indexPatternList = $route.current.locals.indexPatterns.map(pattern => {
            const id = pattern.id;

            return {
              id: id,
              title: pattern.get('title'),
              url: kbnUrl.eval('#/management/kibana/indices/{{id}}', { id: id }),
              class: 'sidebar-item-title ' + ($scope.editingId === id ? 'active' : ''),
              default: $scope.defaultIndex === id
            };
          });
        });
      }
    };
  });

management.getSection('kibana').register('indices', {
  display: 'Index Patterns',
  order: 0,
  url: '#/management/kibana/indices/'
});

FeatureCatalogueRegistryProvider.register(() => {
  return {
    id: 'index_patterns',
    title: 'Index Patterns',
    description: 'Manage the index patterns that help retrieve your data from Elasticsearch.',
    icon: 'indexPatternApp',
    path: '/app/kibana#/management/kibana/indices',
    showOnHomePage: true,
    category: FeatureCatalogueCategory.ADMIN
  };
});
