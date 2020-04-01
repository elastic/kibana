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

import uiRoutes from 'ui/routes';
import angularTemplate from './angular_template.html';
import { npStart } from 'ui/new_platform';
import { setup as managementSetup } from '../../../../../../management/public/legacy';
import { getCreateBreadcrumbs } from '../breadcrumbs';

import { renderCreateIndexPatternWizard, destroyCreateIndexPatternWizard } from './render';

uiRoutes.when('/management/kibana/index_pattern', {
  template: angularTemplate,
  k7Breadcrumbs: getCreateBreadcrumbs,
  controller: function($scope, $injector) {
    // Wait for the directives to execute
    const kbnUrl = $injector.get('kbnUrl');
    $scope.$$postDigest(() => {
      const $routeParams = $injector.get('$routeParams');
      const indexPatternCreationType = managementSetup.indexPattern.creation.getType(
        $routeParams.type
      );
      const services = {
        config: npStart.core.uiSettings,
        es: npStart.plugins.data.search.__LEGACY.esClient,
        indexPatterns: npStart.plugins.data.indexPatterns,
        $http: npStart.core.http,
        savedObjectsClient: npStart.core.savedObjects.client,
        indexPatternCreationType,
        changeUrl: url => {
          $scope.$evalAsync(() => kbnUrl.changePath(url));
        },
        openConfirm: npStart.core.overlays.openConfirm,
        uiSettings: npStart.core.uiSettings,
      };

      const initialQuery = $routeParams.id ? decodeURIComponent($routeParams.id) : undefined;

      renderCreateIndexPatternWizard(initialQuery, services);
    });

    $scope.$on('$destroy', destroyCreateIndexPatternWizard);
  },
});
