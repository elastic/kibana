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

var op = require('object-prototype');

var create = op.create;
var assign = op.assign;

// Ensure, when spawning a new child process, that the `options` and the
// `options.env` object passed to the child process function doesn't inherit
// from `Object.prototype`. This protects against similar RCE vulnerabilities
// as described in CVE-2019-7609
module.exports = function(cp) {
  // The `exec` function is currently just a wrapper around `execFile`. So for
  // now there's no need to patch it. If this changes in the future, our tests
  // will fail and we can uncomment the line below.
  //
  // cp.exec = new Proxy(cp.exec, { apply: patchOptions() });

  cp.execFile = new Proxy(cp.execFile, { apply: patchOptions(true) });
  cp.fork = new Proxy(cp.fork, { apply: patchOptions(true) });
  cp.spawn = new Proxy(cp.spawn, { apply: patchOptions(true) });
  cp.execFileSync = new Proxy(cp.execFileSync, { apply: patchOptions(true) });
  cp.execSync = new Proxy(cp.execSync, { apply: patchOptions() });
  cp.spawnSync = new Proxy(cp.spawnSync, { apply: patchOptions(true) });

  return cp;
};

function patchOptions(hasArgs) {
  return function apply(target, thisArg, args) {
    var pos = 1;
    if (pos === args.length) {
      // fn(arg1)
      args[pos] = create();
    } else if (pos < args.length) {
      if (hasArgs && (Array.isArray(args[pos]) || args[pos] == null)) {
        // fn(arg1, args, ...)
        pos++;
      }

      if (pos < args.length && typeof args[pos] === 'object' && args[pos] !== null) {
        // fn(arg1, {}, ...)
        // fn(arg1, args, {}, ...)
        args[pos] = prototypelessSpawnOpts(args[pos]);
      } else if (pos < args.length && args[pos] == null) {
        // fn(arg1, null, ...)
        // fn(arg1, args, null, ...)
        args[pos] = create();
      } else if (pos < args.length && typeof args[pos] === 'function') {
        // fn(arg1, callback)
        // fn(arg1, args, callback)
        args.splice(pos, 0, create());
      }
    }

    return target.apply(thisArg, args);
  };
}

function prototypelessSpawnOpts(obj) {
  var prototypelessObj = assign(obj);

  // The `process.env` fallback has been hardened elsewhere, so here we only
  // care about the case where an `env` option is provided.
  if (prototypelessObj.env) {
    prototypelessObj.env = assign(prototypelessObj.env);
  }

  return prototypelessObj;
}
