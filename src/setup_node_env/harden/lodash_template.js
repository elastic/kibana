/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

var isIterateeCall = require('lodash/_isIterateeCall');

function createProxy(template) {
  return new Proxy(template, {
    apply: function (target, thisArg, args) {
      if (args.length === 1 || isIterateeCall(args)) {
        return target.apply(thisArg, [args[0], { sourceURL: '' }]);
      }

      var options = Object.assign({}, args[1]);
      options.sourceURL = (options.sourceURL + '').replace(/\s/g, ' ');
      var newArgs = args.slice(0); // copy
      newArgs.splice(1, 1, options); // replace options in the copy
      return target.apply(thisArg, newArgs);
    },
  });
}

function createFpProxy(template) {
  // we have to do the require here, so that we get the patched version
  var _ = require('lodash');
  return new Proxy(template, {
    apply: function (target, thisArg, args) {
      // per https://github.com/lodash/lodash/wiki/FP-Guide
      // > Iteratee arguments are capped to avoid gotchas with variadic iteratees.
      // this means that we can't specify the options in the second argument to fp.template because it's ignored.
      // Instead, we're going to use the non-FP _.template with only the first argument which has already been patched

      // we use lodash.template here to harden third-party usage of this otherwise banned function.
      // eslint-disable-next-line no-restricted-properties
      return _.template(args[0]);
    },
  });
}

module.exports = { createProxy, createFpProxy };
