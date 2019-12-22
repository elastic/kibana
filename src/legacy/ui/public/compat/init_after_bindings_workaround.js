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

/**
 *  WHAT NEEDS THIS WORKAROUND?
 *  ===========================
 *  Any directive that meets all of the following criteria:
 *   - uses isolate scope bindings
 *   - sets `bindToController: true`
 *   - synchronously accesses the bound values in the controller constructor
 *
 *
 *
 *  HOW DO I GET RID OF IT?
 *  =======================
 *  The quick band-aid solution:
 *    Wrap your constructor logic so it doesn't access bound values
 *    synchronously. This can have subtle bugs which is why I didn't
 *    just wrap all of the offenders in $timeout() and made this
 *    workaround instead.
 *
 *  The more complete solution:
 *    Use the new component lifecycle methods, like `$onInit()`, to access
 *    bindings immediately after the constructor is called, which shouldn't
 *    have any observable effect outside of the constructor.
 *
 *    NOTE: `$onInit()` is not dependency injected, if you need controller specific
 *      dependencies like `$scope` then you're probably using watchers and should
 *      take a look at the new one-way data flow facilities available to
 *      directives/components:
 *
 *      https://docs.angularjs.org/guide/component#component-based-application-architecture
 *
 */

export class InitAfterBindingsWorkaround {
  static $inject = ['$injector', '$attrs', '$element', '$scope', '$transclude'];
  constructor($injector, $attrs, $element, $scope, $transclude) {
    if (!this.initAfterBindings) {
      throw new Error(
        'When using inheritance you must move the logic in the constructor to the `initAfterBindings` method'
      );
    }

    this.$onInit = () => {
      $injector.invoke(this.initAfterBindings, this, {
        $attrs,
        $element,
        $scope,
        $transclude,
      });
    };
  }
}

export function callAfterBindingsWorkaround(constructor) {
  return function InitAfterBindingsWrapper($injector, $attrs, $element, $scope, $transclude) {
    this.$onInit = () => {
      $injector.invoke(constructor, this, {
        $attrs,
        $element,
        $scope,
        $transclude,
      });
    };
  };
}
