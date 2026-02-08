/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Node.js environment setup for Kibana.
 *
 * TypeScript support is provided by:
 * - CJS require hook (ts_require_hook.js) using esbuild — replaces babel-register
 * - ESM resolve hooks (ts_resolve_hooks.mjs) for extensionless .ts imports in ESM context
 * - Vite Module Runner for dev mode (`yarn start`)
 */

// Register esbuild-based CJS require hook for .ts/.tsx files.
// This replaces babel-register: compiles TypeScript to CJS on-the-fly,
// and patches Module._resolveFilename to try .ts extensions.
require('./ts_require_hook');

// Register ESM resolve hooks for .mts scripts and ESM contexts.
// These try .ts extensions for extensionless ESM imports.
const { register } = require('node:module');
const { pathToFileURL } = require('node:url');
register(pathToFileURL(require.resolve('./ts_resolve_hooks.mjs')));

// Development environment setup
require('./setup_env');

// Restore < Node 16 default DNS lookup behavior
require('./dns_ipv4_first');

// Security hardening
require('@kbn/security-hardening');
