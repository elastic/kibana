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
