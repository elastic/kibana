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

// Ensure, when spawning a new child process, that the `options` and the
// `options.env` object passed to the child process function doesn't inherit
// from `Object.prototype`. This protects against similar RCE vulnerabilities
// as described in CVE-2019-7609
module.exports = function(cp) {
  cp.exec = new Proxy(cp.exec, { apply: patchOptionsAtIndex(1) });
  cp.execFile = new Proxy(cp.execFile, { apply: patchOptionsAtIndex(2) });
  cp.fork = new Proxy(cp.fork, { apply: patchOptionsAtIndex(2) });
  cp.spawn = new Proxy(cp.spawn, { apply: patchOptionsAtIndex(2) });
  cp.execFileSync = new Proxy(cp.execFileSync, { apply: patchOptionsAtIndex(2) });
  cp.execSync = new Proxy(cp.execSync, { apply: patchOptionsAtIndex(1) });
  cp.spawnSync = new Proxy(cp.spawnSync, { apply: patchOptionsAtIndex(2) });
  return cp;
};

function patchOptionsAtIndex(index) {
  return function apply(target, thisArg, argumentsList) {
    argumentsList[index] = prototypelessSpawnOpts(argumentsList[index]);
    return target.apply(thisArg, argumentsList);
  };
}

function prototypelessSpawnOpts(obj) {
  var prototypelessObj = Object.assign(Object.create(null), obj);

  // The `process.env` fallback has been hardened elsewhere, so here we only
  // care about the case where an `env` option is provided.
  if (prototypelessObj.env) {
    prototypelessObj.env = Object.assign(Object.create(null), prototypelessObj.env);
  }

  return prototypelessObj;
}
