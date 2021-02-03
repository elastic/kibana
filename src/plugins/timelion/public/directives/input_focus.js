/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export function initInputFocusDirective(app) {
  app.directive('inputFocus', function ($parse, $timeout) {
    return {
      restrict: 'A',
      link: function ($scope, $elem, attrs) {
        const isDisabled = attrs.disableInputFocus && $parse(attrs.disableInputFocus)($scope);
        if (!isDisabled) {
          $timeout(function () {
            $elem.focus();
            if (attrs.inputFocus === 'select') $elem.select();
          });
        }
      },
    };
  });
}
