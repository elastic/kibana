/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// Ensure, when spawning a new child process, that the `options` and the
// `options.env` object passed to the child process function doesn't inherit
// from `Object.prototype`. This protects against similar RCE vulnerabilities
// as described in CVE-2019-7609
function patchChildProcess(cp) {
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
}

function patchOptions(hasArgs) {
  return function apply(target, thisArg, args) {
    var pos = 1;
    var newArgs = Object.setPrototypeOf([].concat(args), null);

    if (pos === newArgs.length) {
      // fn(arg1)
      newArgs[pos] = prototypelessSpawnOpts();
    } else if (pos < newArgs.length) {
      if (hasArgs && (Array.isArray(newArgs[pos]) || newArgs[pos] == null)) {
        // fn(arg1, args, ...)
        pos++;
      }

      if (typeof newArgs[pos] === 'object' && newArgs[pos] !== null) {
        // fn(arg1, {}, ...)
        // fn(arg1, args, {}, ...)
        newArgs[pos] = prototypelessSpawnOpts(newArgs[pos]);
      } else if (newArgs[pos] == null) {
        // fn(arg1, null/undefined, ...)
        // fn(arg1, args, null/undefined, ...)
        newArgs[pos] = prototypelessSpawnOpts();
      } else if (typeof newArgs[pos] === 'function') {
        // fn(arg1, callback)
        // fn(arg1, args, callback)
        // `newArgs` doesn't have prototype and hence `splice` method anymore.
        Array.prototype.splice.call(newArgs, pos, 0, prototypelessSpawnOpts());
      }
    }

    return target.apply(thisArg, newArgs);
  };
}

function prototypelessSpawnOpts(obj) {
  var prototypelessObj = Object.assign(Object.create(null), obj);
  prototypelessObj.env = Object.assign(Object.create(null), prototypelessObj.env || process.env);
  return prototypelessObj;
}

module.exports = patchChildProcess;
