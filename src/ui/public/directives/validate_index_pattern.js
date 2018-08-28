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

import _ from 'lodash';
import { uiModules } from '../modules';
// See https://github.com/elastic/elasticsearch/issues/6736

uiModules
  .get('kibana')
  .directive('validateIndexPattern', function () {
    return {
      restrict: 'A',
      require: 'ngModel',
      link: function ($scope, elem, attr, ngModel) {
        const illegalCharacters = ['\\', '/', '?', '"', '<', '>', '|', ' '];

        const allowWildcard =
          !_.isUndefined(attr.validateIndexPatternAllowWildcard)
          && attr.validateIndexPatternAllowWildcard !== 'false';

        if (!allowWildcard) {
          illegalCharacters.push('*');
        }

        const isValid = function (input) {
          if (input == null || input === '') return !attr.required === true;
          if (input === '.' || input === '..') return false;

          const match = _.find(illegalCharacters, function (character) {
            return input.indexOf(character) >= 0;
          });

          return !match;
        };

        ngModel.$validators.indexPattern = function (modelValue, viewValue) {
          return isValid(viewValue);
        };
      }
    };
  });
