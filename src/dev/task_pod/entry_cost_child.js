/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Runs inside a fresh process (spawned by entry_cost.js): requires one entry and prints the RSS
// it cost, optionally attributed to the package whose files were loaded.
require('@kbn/setup-node-env');

const fs = require('fs');
const path = require('path');
const Module = require('module');

const entry = process.argv[2];
const trace = process.argv.includes('--trace');
const baseline = (process.env.TASK_POD_BASELINE || '').split(',').filter(Boolean);
const rssMb = () => process.memoryUsage().rss / 1048576;

const pkgCache = new Map();
const packageOf = (file) => {
  let dir = path.dirname(file);
  const visited = [];
  while (dir !== path.dirname(dir)) {
    if (pkgCache.has(dir)) break;
    visited.push(dir);
    if (fs.existsSync(path.join(dir, 'kibana.jsonc'))) {
      try {
        const id = JSON.parse(
          fs.readFileSync(path.join(dir, 'kibana.jsonc'), 'utf8').replace(/^\s*\/\/.*$/gm, '')
        ).id;
        visited.forEach((d) => pkgCache.set(d, id));
        return id;
      } catch (e) {
        break;
      }
    }
    dir = path.dirname(dir);
  }
  const hit = pkgCache.get(dir);
  if (hit) visited.forEach((d) => pkgCache.set(d, hit));
  return (
    hit ||
    (file.includes('node_modules')
      ? 'node_modules:' + file.split('node_modules/').pop().split('/')[0]
      : 'other')
  );
};

const exclusive = new Map();
const stack = [];
if (trace) {
  const origLoad = Module._load;
  Module._load = function (request, parent, isMain) {
    let filename;
    try {
      filename = Module._resolveFilename(request, parent, isMain);
    } catch (e) {
      return origLoad.apply(this, arguments);
    }
    if (Module._cache[filename]) return origLoad.apply(this, arguments);
    const frame = { start: rssMb(), children: 0 };
    stack.push(frame);
    try {
      return origLoad.apply(this, arguments);
    } finally {
      stack.pop();
      const total = rssMb() - frame.start;
      if (stack.length) stack[stack.length - 1].children += total;
      const pkg = packageOf(filename);
      exclusive.set(pkg, (exclusive.get(pkg) || 0) + total - frame.children);
    }
  };
}

// eslint-disable-next-line import/no-dynamic-require
baseline.forEach((m) => require(m));
global.gc();
const before = rssMb();
// eslint-disable-next-line import/no-dynamic-require
require(entry.startsWith('.') ? path.resolve(entry) : entry);
global.gc();
const result = { entry, deltaMb: Math.round(rssMb() - before) };
if (trace) {
  result.packages = [...exclusive.entries()]
    .map(([pkg, mb]) => ({ pkg, mb: Math.round(mb * 10) / 10 }))
    .sort((a, b) => b.mb - a.mb)
    .slice(0, 15);
}
console.log(JSON.stringify(result));
