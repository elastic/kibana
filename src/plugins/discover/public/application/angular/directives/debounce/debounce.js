/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import _ from 'lodash';
// Debounce service, angularized version of lodash debounce
// borrowed heavily from https://github.com/shahata/angular-debounce

export function createDebounceProviderTimeout($timeout) {
  return function (func, wait, options) {
    let timeout;
    let args;
    let self;
    let result;
    options = _.defaults(options || {}, {
      leading: false,
      trailing: true,
      invokeApply: true,
    });

    function debounce() {
      self = this;
      args = arguments;

      const later = function () {
        timeout = null;
        if (!options.leading || options.trailing) {
          result = func.apply(self, args);
        }
      };

      const callNow = options.leading && !timeout;

      if (timeout) {
        $timeout.cancel(timeout);
      }
      timeout = $timeout(later, wait, options.invokeApply);

      if (callNow) {
        result = func.apply(self, args);
      }

      return result;
    }

    debounce.cancel = function () {
      $timeout.cancel(timeout);
      timeout = null;
    };

    return debounce;
  };
}
