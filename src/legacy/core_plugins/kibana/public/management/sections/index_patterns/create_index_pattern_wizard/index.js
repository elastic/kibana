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

import { SavedObjectsClientProvider } from 'ui/saved_objects';
import uiRoutes from 'ui/routes';
import angularTemplate from './angular_template.html';
import 'ui/index_patterns';
import { IndexPatternCreationFactory } from 'ui/management/index_pattern_creation';
import { getCreateBreadcrumbs } from '../breadcrumbs';

import { renderCreateIndexPatternWizard, destroyCreateIndexPatternWizard } from './render';

uiRoutes.when('/management/kibana/index_pattern', {
  template: angularTemplate,
  k7Breadcrumbs: getCreateBreadcrumbs,
  controller: function ($scope, $injector) {
    // Wait for the directives to execute
    const kbnUrl = $injector.get('kbnUrl');
    const Private = $injector.get('Private');
    $scope.$$postDigest(() => {
      const $routeParams = $injector.get('$routeParams');
      const indexPatternCreationProvider = Private(IndexPatternCreationFactory)($routeParams.type);
      const indexPatternCreationType = indexPatternCreationProvider.getType();
      const services = {
        config: $injector.get('config'),
        es: $injector.get('es'),
        indexPatterns: $injector.get('indexPatterns'),
        $http: $injector.get('$http'),
        savedObjectsClient: Private(SavedObjectsClientProvider),
        indexPatternCreationType,
        confirmModalPromise: $injector.get('confirmModalPromise'),
        changeUrl: url => {
          $scope.$evalAsync(() => kbnUrl.changePath(url));
        },
      };

      const initialQuery = $routeParams.id ? decodeURIComponent($routeParams.id) : undefined;

      renderCreateIndexPatternWizard(
        initialQuery,
        services
      );
    });

    $scope.$on('$destroy', destroyCreateIndexPatternWizard);
  }
});
