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

import './sections';
import 'ui/filters/start_from';
import 'ui/field_editor';
import uiRoutes from 'ui/routes';
import { uiModules } from 'ui/modules';
import appTemplate from './app.html';
import landingTemplate from './landing.html';
import { management } from 'ui/management';
import { FeatureCatalogueRegistryProvider, FeatureCatalogueCategory } from 'ui/registry/feature_catalogue';
import { timefilter } from 'ui/timefilter';
import 'ui/kbn_top_nav';

uiRoutes
  .when('/management', {
    template: landingTemplate
  });

uiRoutes
  .when('/management/:section', {
    redirectTo: '/management'
  });

require('ui/index_patterns/route_setup/load_default')({
  whenMissingRedirectTo: '/management/kibana/index'
});

uiModules
  .get('apps/management')
  .directive('kbnManagementApp', function (Private, $location) {
    return {
      restrict: 'E',
      template: appTemplate,
      transclude: true,
      scope: {
        sectionName: '@section',
        omitPages: '@omitBreadcrumbPages',
        pageTitle: '='
      },

      link: function ($scope) {
        timefilter.disableAutoRefreshSelector();
        timefilter.disableTimeRangeSelector();
        $scope.sections = management.items.inOrder;
        $scope.section = management.getSection($scope.sectionName) || management;

        if ($scope.section) {
          $scope.section.items.forEach(item => {
            item.active = `#${$location.path()}`.indexOf(item.url) > -1;
          });
        }
      }
    };
  });

uiModules
  .get('apps/management')
  .directive('kbnManagementLanding', function (kbnVersion) {
    return {
      restrict: 'E',
      link: function ($scope) {
        $scope.sections = management.items.inOrder;
        $scope.kbnVersion = kbnVersion;
      }
    };
  });

FeatureCatalogueRegistryProvider.register(() => {
  return {
    id: 'management',
    title: 'Management',
    description: 'Your center console for managing the Elastic Stack.',
    icon: 'managementApp',
    path: '/app/kibana#/management',
    showOnHomePage: false,
    category: FeatureCatalogueCategory.ADMIN
  };
});
