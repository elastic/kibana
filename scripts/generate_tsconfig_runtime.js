#!/usr/bin/env node

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable no-restricted-syntax */

/**
 * Produces `tsconfig.runtime.json` at the repo root for tools that follow tsconfig
 * `paths` at runtime/build time (tsx loaded by Cypress, rspack via its `tsConfig`
 * resolve option, etc.).
 *
 * `tsconfig.base.json` redirects a handful of bare specifiers (axios, @langchain/core*)
 * to their `.d.ts` files. That mapping is necessary for TS declaration emit — it forces
 * the ESM types branch to avoid TS2883 ("emitted .d.ts references unportable .d.cts").
 * But anything that resolves modules using these paths at build/runtime ends up trying
 * to execute a .d.ts as JavaScript and crashes.
 *
 * This script copies `compilerOptions` from the base config and removes the offending
 * top-level mappings so resolvers fall through to `node_modules` and pick the real
 * package via `package.json#main`/`exports`.
 *
 * Subpath mappings (e.g. `elasticsearch-8.x/lib/api/types`) are left intact: they map
 * deep paths that no real runtime code imports literally, so they don't get followed
 * by bundlers/loaders.
 */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const REPO_ROOT = path.resolve(__dirname, '..');
const BASE = path.join(REPO_ROOT, 'tsconfig.base.json');
const OUT = path.join(REPO_ROOT, 'tsconfig.runtime.json');

// Bare-specifier mappings in tsconfig.base.json that point at .d.ts files for
// declaration-emit reasons. These break runtime/bundler resolvers, so strip them
// here so the resolver falls through to node_modules.
const SPECIFIERS_TO_STRIP = ['axios', '@langchain/core', '@langchain/core/*'];

const result = ts.readConfigFile(BASE, ts.sys.readFile);
if (result.error) {
  console.error(result.error.messageText);
  process.exit(1);
}

const config = result.config;
if (!config.compilerOptions || !config.compilerOptions.paths) {
  console.error('tsconfig.base.json: missing compilerOptions.paths');
  process.exit(1);
}

const stripped = [];
for (const specifier of SPECIFIERS_TO_STRIP) {
  if (config.compilerOptions.paths[specifier]) {
    delete config.compilerOptions.paths[specifier];
    stripped.push(specifier);
  }
}

// @langchain/core has 3 explicit subpath mappings; strip any that exist.
for (const sub of ['messages', 'tools', 'documents']) {
  const key = `@langchain/core/${sub}`;
  if (config.compilerOptions.paths[key]) {
    delete config.compilerOptions.paths[key];
    stripped.push(key);
  }
}

const banner = `/*
 * This file is generated. Do not edit it by hand.
 * Run: node scripts/generate_tsconfig_runtime.js
 *
 * Stripped from tsconfig.base.json paths: ${stripped.join(', ')}
 */`;

fs.writeFileSync(OUT, `${banner}\n${JSON.stringify(config, null, 2)}\n`);
console.log(`Wrote ${path.relative(REPO_ROOT, OUT)} (stripped: ${stripped.join(', ')})`);
