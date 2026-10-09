/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Load the plugin server bundle only in the Kibana server process.
// Workers and the dev CLI parent inherit NODE_OPTIONS; skip them.
var workerThreads = require('node:worker_threads');
var path = require('path');
var paths = require('./paths');
var isMainThread = workerThreads.isMainThread;
var REPO = paths.REPO;
var OUT = paths.OUT;

if (process.env.KBN_PLUGIN_BUNDLE === '1' && process.env.isDevCliChild !== 'true' && isMainThread) {
  console.log('[kbn-plugin-bundle] preload start');

  var Module = require('node:module');
  var repoNodeModules = path.join(REPO, 'node_modules');
  var distNodeModules = process.env.KBN_DIST_NODE_MODULES;

  var origNodeModulePaths = Module._nodeModulePaths;
  Module._nodeModulePaths = function patchedNodeModulePaths(from) {
    var lookupPaths = origNodeModulePaths.call(this, from);
    if (distNodeModules && lookupPaths.indexOf(distNodeModules) === -1) {
      lookupPaths.unshift(distNodeModules);
    }
    if (lookupPaths.indexOf(repoNodeModules) === -1) {
      lookupPaths.push(repoNodeModules);
    }
    return lookupPaths;
  };
  if (distNodeModules && module.paths.indexOf(distNodeModules) === -1) {
    module.paths.unshift(distNodeModules);
  }
  if (module.paths.indexOf(repoNodeModules) === -1) {
    module.paths.push(repoNodeModules);
  }

  require('@kbn/setup-node-env');
  // Loaded through Module._load so the generated bundle stays outside the repo
  // and still lands in Node's module cache, including fileContentsCache.
  Module._load(path.join(OUT, 'plugins.cjs'), module, false);

  var moduleHooks = require('node:module');
  var url = require('url');
  var v8 = require('v8');
  var shortCircuits = 0;

  function moduleKey(specifier) {
    var trimmed;
    var mods;
    var keys;
    var i;
    var key;
    var best;
    var bestLen;
    var boundary;
    if (typeof specifier !== 'string' || specifier.charAt(0) !== '/') return undefined;
    trimmed = specifier.replace(/\/index\.(ts|js)$/, '');
    if (trimmed.slice(-7) !== '/server') return undefined;
    mods = global.__KBN_PLUGIN_MODULES;
    if (!mods) return trimmed;
    if (mods[trimmed]) return trimmed;
    // Distributable plugins live at <dist>/<repo-relative>/server, not the checkout path.
    keys = Object.keys(mods);
    best = undefined;
    bestLen = -1;
    for (i = 0; i < keys.length; i++) {
      key = keys[i];
      if (key.charAt(0) === '/') continue;
      boundary = trimmed.length - key.length;
      if (
        boundary > 0 &&
        trimmed.charAt(boundary - 1) === '/' &&
        trimmed.slice(boundary) === key &&
        key.length > bestLen
      ) {
        best = key;
        bestLen = key.length;
      }
    }
    return best;
  }

  moduleHooks.registerHooks({
    resolve: function (specifier, context, nextResolve) {
      var key = moduleKey(specifier);
      if (key && global.__KBN_PLUGIN_MODULES && global.__KBN_PLUGIN_MODULES[key]) {
        shortCircuits += 1;
        console.log('[kbn-plugin-bundle] short-circuit', shortCircuits, key);
        return {
          url: url.pathToFileURL(key + '/index.js').href,
          shortCircuit: true,
          format: 'commonjs',
        };
      }
      return nextResolve(specifier, context);
    },
    load: function (moduleUrl, context, nextLoad) {
      var key;
      if (moduleUrl.indexOf('file:') === 0 && global.__KBN_PLUGIN_MODULES) {
        key = moduleKey(url.fileURLToPath(moduleUrl));
        if (key && global.__KBN_PLUGIN_MODULES[key]) {
          return {
            format: 'commonjs',
            shortCircuit: true,
            source: 'module.exports = global.__KBN_PLUGIN_MODULES[' + JSON.stringify(key) + '];\n',
          };
        }
      }
      return nextLoad(moduleUrl, context);
    },
  });

  var snapshotPath = path.join(OUT, 'bundle-security.heapsnapshot');
  process.on('SIGUSR2', function () {
    console.log('[kbn-plugin-bundle] writing heap snapshot', snapshotPath);
    v8.writeHeapSnapshot(snapshotPath);
    console.log('[kbn-plugin-bundle] snapshot written', snapshotPath);
  });

  console.log('[kbn-plugin-bundle] preload ready');
}
