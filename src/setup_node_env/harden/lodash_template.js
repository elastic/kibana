/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

var hook = require('require-in-the-middle');
var isIterateeCall = require('lodash/_isIterateeCall');

hook(['lodash'], function (lodash) {
  lodash.template = createProxy(lodash.template);
  return lodash;
});

hook(['lodash/template'], function (template) {
  return createProxy(template);
});

hook(['lodash/fp'], function (fp) {
  fp.template = createFpProxy(fp.template);
  return fp;
});

hook(['lodash/fp/template'], function (template) {
  return createFpProxy(template);
});

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
      return _.template(args[0]);
    },
  });
}
