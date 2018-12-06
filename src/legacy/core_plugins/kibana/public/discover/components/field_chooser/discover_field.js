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

import $ from 'jquery';
import html from './discover_field.html';
import _ from 'lodash';
import 'ui/directives/css_truncate';
import 'ui/directives/field_name';
import detailsHtml from './lib/detail_views/string.html';
import { uiModules } from 'ui/modules';
const app = uiModules.get('apps/discover');

app.directive('discoverField', function ($compile, i18n) {
  return {
    restrict: 'E',
    template: html,
    replace: true,
    scope: {
      field: '=',
      onAddField: '=',
      onAddFilter: '=',
      onRemoveField: '=',
      onShowDetails: '=',
    },
    link: function ($scope, $elem) {
      let detailsElem;
      let detailScope;

      const init = function () {
        if ($scope.field.details) {
          $scope.toggleDetails($scope.field, true);
        }

        $scope.addRemoveButtonLabel = $scope.field.display
          ? i18n('kbn.discover.fieldChooser.discoverField.removeButtonLabel', {
            defaultMessage: 'remove',
          })
          : i18n('kbn.discover.fieldChooser.discoverField.addButtonLabel', {
            defaultMessage: 'add',
          });
      };

      const getWarnings = function (field) {
        let warnings = [];

        if (field.scripted) {
          warnings.push('Scripted fields can take a long time to execute.');
        }

        if (warnings.length > 1) {
          warnings = warnings.map(function (warning, i) {
            return (i > 0 ? '\n' : '') + (i + 1) + ' - ' + warning;
          });
        }

        return warnings;

      };

      $scope.toggleDisplay = function (field) {
        if (field.display) {
          $scope.onRemoveField(field.name);
        } else {
          $scope.onAddField(field.name);
        }

        if (field.details) {
          $scope.toggleDetails(field);
        }
      };

      $scope.onClickToggleDetails = function onClickToggleDetails($event, field) {
        // Do nothing if the event originated from a child.
        if ($event.currentTarget !== $event.target) {
          $event.preventDefault();
        }

        $scope.toggleDetails(field);
      };

      $scope.toggleDetails = function (field, recompute) {
        if (_.isUndefined(field.details) || recompute) {
          $scope.onShowDetails(field, recompute);
          detailScope = $scope.$new();
          detailScope.warnings = getWarnings(field);
          detailScope.getBucketAriaLabel = (bucket) => {
            return i18n('kbn.discover.fieldChooser.discoverField.bucketAriaLabel', {
              defaultMessage: 'Value: {value}',
              values: {
                value: bucket.display === ''
                  ? i18n('kbn.discover.fieldChooser.discoverField.emptyStringText', {
                    defaultMessage: 'Empty string',
                  })
                  : bucket.display,
              },
            });
          };

          detailsElem = $(detailsHtml);
          $compile(detailsElem)(detailScope);
          $elem.append(detailsElem).addClass('active');
          $elem.find('.dscSidebarItem').addClass('dscSidebarItem--active');
        } else {
          delete field.details;
          detailScope.$destroy();
          detailsElem.remove();
          $elem.removeClass('active');
          $elem.find('.dscSidebarItem').removeClass('dscSidebarItem--active');
        }
      };

      init();
    }
  };
});
