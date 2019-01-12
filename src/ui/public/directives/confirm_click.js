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

import { uiModules } from '../modules';
uiModules
  .get('kibana')
  .directive('confirmClick', function ($window, i18n) {
    return {
      restrict: 'A',
      link: function ($scope, $elem, attrs) {
        $elem.bind('click', function () {
          const message = attrs.confirmation || i18n('common.ui.directives.confirmClickButtonLabel', {
            defaultMessage: 'Are you sure?'
          });
          if ($window.confirm(message)) { // eslint-disable-line no-alert
            const action = attrs.confirmClick;
            if (action) {
              $scope.$apply($scope.$eval(action));
            }
          }
        });

        $scope.$on('$destroy', function () {
          $elem.unbind('click');
        });
      },
    };
  });
