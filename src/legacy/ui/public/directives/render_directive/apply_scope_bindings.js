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

import { forOwn, noop } from 'lodash';

import '../../directives/bind';

const bindingRE = /^(=|=\?|&|@)([a-zA-Z0-9_$]+)?$/;

export function ApplyScopeBindingsProvider($parse) {
  return function (bindings, $scope, $attrs) {
    forOwn(bindings, (binding, local) => {
      if (!bindingRE.test(binding)) {
        throw new Error(`Invalid scope binding "${binding}". Expected it to match ${bindingRE}`);
      }

      const [, type, attribute = local] = binding.match(bindingRE);
      const attr = $attrs[attribute];
      switch (type) {
        case '=':
          $scope.$bind(local, attr);
          break;
        case '=?':
          throw new Error(
            '<render-directive> does not currently support optional two-way bindings.'
          );
          break;
        case '&':
          if (attr) {
            const getter = $parse(attr);
            $scope[local] = function () {
              return getter($scope.$parent);
            };
          } else {
            $scope[local] = noop;
          }
          break;
        case '@':
          $scope[local] = attr;
          $attrs.$observe(attribute, (v) => ($scope[local] = v));
          break;
      }
    });
  };
}
