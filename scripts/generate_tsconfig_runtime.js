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
 * Produces `tsconfig.runtime.json` at the repo root for Node/tsx loaders (e.g. Cypress)
 * that must resolve `axios` to JS, not the emit-only `index.d.ts` mapping in
 * `tsconfig.base.json`.
 *
 * TypeScript `extends` merges do not support partial `paths` overrides, so this
 * script copies `compilerOptions` from the base and patches a single key.
 */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const REPO_ROOT = path.resolve(__dirname, '..');
const BASE = path.join(REPO_ROOT, 'tsconfig.base.json');
const OUT = path.join(REPO_ROOT, 'tsconfig.runtime.json');

const result = ts.readConfigFile(BASE, ts.sys.readFile);
if (result.error) {
  const message = result.error.messageText;
  // eslint-disable-next-line no-console
  console.error(message);
  process.exit(1);
}

const config = result.config;
if (!config.compilerOptions) {
  // eslint-disable-next-line no-console
  console.error('tsconfig.base.json: missing compilerOptions');
  process.exit(1);
}
if (!config.compilerOptions.paths) {
  // eslint-disable-next-line no-console
  console.error('tsconfig.base.json: missing compilerOptions.paths');
  process.exit(1);
}

// Runtime resolution: load the Node CJS build (see axios package "main")
config.compilerOptions.paths.axios = ['./node_modules/axios/dist/node/axios.cjs'];

const banner = `/*
 * This file is generated. Do not edit it by hand.
 * Run: node scripts/generate_tsconfig_runtime.js
 */`;

const body = JSON.stringify(config, null, 2) + '\n';
fs.writeFileSync(OUT, `${banner}\n${body}`);

// eslint-disable-next-line no-console
console.log(`Wrote ${path.relative(REPO_ROOT, OUT)} (${config.compilerOptions.paths.axios[0]})`);
