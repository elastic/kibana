/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Browser-only node modules that must never be loaded by the Kibana server at startup. Matched
 * against the resolved node module name, so `@elastic/eui/lib/...` is caught while the pure
 * `@elastic/eui-theme-*` packages are not. `react`, `react-dom` and `@emotion/*` are deliberately
 * absent: core renders the bootstrap HTML template with React on the server.
 */
export const BANNED_NODE_MODULES: readonly string[] = [
  '@elastic/eui',
  '@elastic/apm-rum',
  '@elastic/apm-rum-core',
  '@elastic/apm-rum-react',
  'react-intl',
  'react-use',
  'react-redux',
  'react-redux-v7',
  'redux',
  'redux-v4',
  '@reduxjs/toolkit',
  'redux-toolkit-v1',
  'refractor',
  'prismjs',
];

const BANNED = new Set(BANNED_NODE_MODULES);

export const isBannedNodeModule = (nodeModule: string): boolean => BANNED.has(nodeModule);
