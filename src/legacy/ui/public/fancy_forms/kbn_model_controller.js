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

export function decorateModelController($delegate, $injector) {
  const [directive] = $delegate;
  const ModelController = directive.controller;

  class KbnModelController extends ModelController {
    // prevent inheriting ModelController's static $inject property
    // which is angular's cache of the DI arguments for a function
    static $inject = ['$scope', '$element'];

    constructor($scope, $element, ...superArgs) {
      super(...superArgs);

      const onInvalid = () => {
        this.$setTouched();
      };

      // the browser emits an "invalid" event when browser supplied
      // validation fails, which implies that the user has indirectly
      // interacted with the control and it should be treated as "touched"
      $element.on('invalid', onInvalid);
      $scope.$on('$destroy', () => {
        $element.off('invalid', onInvalid);
      });
    }
  }

  // replace controller with our wrapper
  directive.controller = [
    ...$injector.annotate(KbnModelController),
    ...$injector.annotate(ModelController),
    (...args) => (
      new KbnModelController(...args)
    )
  ];

  return $delegate;
}
