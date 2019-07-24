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

import truncText from 'trunc-text';
import { i18n } from '@kbn/i18n';
import truncHTML from 'trunc-html';
import { uiModules } from '../../modules';
import truncatedTemplate from '../partials/truncated.html';
import 'angular-sanitize';

const module = uiModules.get('kibana', ['ngSanitize']);

module.directive('kbnTruncated', function () {
  return {
    restrict: 'E',
    scope: {
      source: '@',
      length: '@',
      isHtml: '@'
    },
    template: truncatedTemplate,
    link: function ($scope) {
      const source = $scope.source;
      const max = $scope.length;
      const truncated = $scope.isHtml
        ? truncHTML(source, max).html
        : truncText(source, max);

      $scope.content = truncated;

      if (source === truncated) {
        return;
      }
      $scope.truncated = true;
      $scope.expanded = false;
      const showLessText = i18n.translate('common.ui.directives.truncated.showLessLinkText', {
        defaultMessage: 'less'
      });
      const showMoreText = i18n.translate('common.ui.directives.truncated.showMoreLinkText', {
        defaultMessage: 'more'
      });
      $scope.action = showMoreText;
      $scope.toggle = () => {
        $scope.expanded = !$scope.expanded;
        $scope.content = $scope.expanded ? source : truncated;
        $scope.action = $scope.expanded ? showLessText : showMoreText;
      };
    }
  };
});
