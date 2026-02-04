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
 * NOTE: babel-register has been removed. TypeScript transpilation is now handled by:
 * - Vite Module Runner for dev mode (`yarn start --use-vite`)
 * - Pre-transpiled cache (`.transpile-cache/`) from `yarn transpile`
 *
 * Scripts that need TypeScript support should either:
 * 1. Use `yarn transpile` to pre-build packages
 * 2. Use the Vite-based dev mode
 * 3. Be converted to JavaScript
 */

// Development environment setup
require('./setup_env');

// Restore < Node 16 default DNS lookup behavior
require('./dns_ipv4_first');

// Security hardening
require('@kbn/security-hardening');
