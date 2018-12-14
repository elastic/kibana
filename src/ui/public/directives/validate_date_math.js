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

import dateMath from '@elastic/datemath';
import { uiModules } from '../modules';

uiModules.get('kibana').directive('validateDateMath', function () {
  return {
    restrict: 'A',
    require: 'ngModel',
    scope: {
      'ngModel': '='
    },
    link: function ($scope, elem, attr, ngModel) {
      ngModel.$parsers.unshift(validateDateMath);
      ngModel.$formatters.unshift(validateDateMath);

      function validateDateMath(input) {
        if (input == null || input === '') {
          ngModel.$setValidity('validDateMath', true);
          return null;
        }

        const moment = dateMath.parse(input);
        ngModel.$setValidity('validDateMath', moment != null && moment.isValid());
        return input;
      }
    }
  };
});
