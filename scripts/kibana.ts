/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Register CJS TypeScript hooks (esbuild compilation + .ts resolution)
require('../src/setup_node_env');

// Load the CLI entry point directly (skip dev.ts which uses top-level await for Vite).
// In the child process (isDevCliChild=true), we don't need the extended stack trace setup.
require('../src/cli/kibana/cli');
