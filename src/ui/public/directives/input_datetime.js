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

import moment from 'moment';
import { uiModules } from '../modules';
const module = uiModules.get('kibana');

module.directive('inputDatetime', function () {
  return {
    restrict: 'A',
    require: 'ngModel',
    link: function ($scope, $elem, attrs, ngModel) {

      const format = 'YYYY-MM-DD HH:mm:ss.SSS';

      $elem.after('<div class="input-datetime-format">' + format + '</div>');

      // What should I make with the input from the user?
      const fromUser = function (text) {
        const parsed = moment(text, format);
        return parsed.isValid() ? parsed : undefined;
      };

      // How should I present the data back to the user in the input field?
      const toUser = function (datetime) {
        return moment(datetime).format(format);
      };

      ngModel.$parsers.push(fromUser);
      ngModel.$formatters.push(toUser);

    }
  };
});
