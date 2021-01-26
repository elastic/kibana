/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
