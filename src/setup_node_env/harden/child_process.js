/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

var hook = require('require-in-the-middle');

// Ensure, when spawning a new child process, that the `options` and the
// `options.env` object passed to the child process function doesn't inherit
// from `Object.prototype`. This protects against similar RCE vulnerabilities
// as described in CVE-2019-7609
hook(['child_process'], function (cp) {
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
});

function patchOptions(hasArgs) {
  return function apply(target, thisArg, args) {
    var pos = 1;
    if (pos === args.length) {
      // fn(arg1)
      args[pos] = prototypelessSpawnOpts();
    } else if (pos < args.length) {
      if (hasArgs && (Array.isArray(args[pos]) || args[pos] == null)) {
        // fn(arg1, args, ...)
        pos++;
      }

      if (typeof args[pos] === 'object' && args[pos] !== null) {
        // fn(arg1, {}, ...)
        // fn(arg1, args, {}, ...)
        args[pos] = prototypelessSpawnOpts(args[pos]);
      } else if (args[pos] == null) {
        // fn(arg1, null/undefined, ...)
        // fn(arg1, args, null/undefined, ...)
        args[pos] = prototypelessSpawnOpts();
      } else if (typeof args[pos] === 'function') {
        // fn(arg1, callback)
        // fn(arg1, args, callback)
        args.splice(pos, 0, prototypelessSpawnOpts());
      }
    }

    return target.apply(thisArg, args);
  };
}

function prototypelessSpawnOpts(obj) {
  var prototypelessObj = Object.assign(Object.create(null), obj);
  prototypelessObj.env = Object.assign(Object.create(null), prototypelessObj.env || process.env);
  return prototypelessObj;
}
