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

import { uiModules } from 'ui/modules';
import template from './index_header.html';
uiModules
  .get('apps/management')
  .directive('kbnManagementIndexHeader', function (config) {
    return {
      restrict: 'E',
      template,
      replace: true,
      scope: {
        indexPattern: '=',
        setDefault: '&',
        refreshFields: '&',
        delete: '&',
      },
      link: function ($scope, $el, attrs) {
        $scope.delete = attrs.delete ? $scope.delete : null;
        $scope.setDefault = attrs.setDefault ? $scope.setDefault : null;
        $scope.refreshFields = attrs.refreshFields ? $scope.refreshFields : null;
        config.bindToScope($scope, 'defaultIndex');
      }
    };
  });
