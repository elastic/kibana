/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-env jest */

const fs = require('fs');
const vm = require('vm');
const path = require('path');

let cached = null;

const loadVegaAndVegaLite = () => {
  if (cached) return cached;

  const sandbox = {
    window: {},
    globalThis: {},
    structuredClone: (obj) => JSON.parse(JSON.stringify(obj)),
  };

  // vega
  const vegaPath = path.resolve('node_modules/vega/build/vega.min.js');
  const vegaCode = fs.readFileSync(vegaPath, 'utf8');
  vm.createContext(sandbox);
  vm.runInContext(vegaCode, sandbox);

  sandbox.window.vega = sandbox.globalThis.vega = sandbox.window.vega || sandbox.globalThis.vega;

  // vega-lite
  const litePath = path.resolve('node_modules/vega-lite/build/vega-lite.min.js');
  const liteCode = fs.readFileSync(litePath, 'utf8');
  vm.runInContext(liteCode, sandbox);

  cached = {
    vega: sandbox.window.vega || sandbox.globalThis.vega,
    vegaLite: sandbox.window.vegaLite || sandbox.globalThis.vegaLite,
  };

  // both Vega and Vega-Lite
  return cached;
};

jest.mock('vega', () => {
  const { vega } = loadVegaAndVegaLite();
  return { ...vega };
});

jest.mock('vega-lite', () => {
  const { vegaLite } = loadVegaAndVegaLite();
  return { ...vegaLite };
});
