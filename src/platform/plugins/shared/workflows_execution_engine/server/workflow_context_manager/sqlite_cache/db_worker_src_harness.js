/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Dev-mode harness for db_worker.ts. In production Kibana uses the compiled
 * db_worker.js; in development this harness sets up the Node environment for
 * on-the-fly TypeScript compilation and then loads the source file directly.
 * Pattern mirrors x-pack/platform/plugins/shared/screenshotting/server/formats/pdf/pdf_maker/worker_src_harness.js
 *
 * NOTE: process.noProcessWarnings must be set before @kbn/setup-node-env is
 * loaded. exit_on_warning.js checks this flag on line 122 and skips installing
 * the process.on('warning') → process.exit(1) handler. Without this, the
 * ExperimentalWarning emitted by `node:sqlite` on import would immediately
 * kill this worker thread (node:sqlite is experimental on Node 24.14.x and
 * emits an ExperimentalWarning that is not in the IGNORE_WARNINGS allow-list).
 */
process.noProcessWarnings = true;

// eslint-disable-next-line @kbn/imports/no_boundary_crossing
require('@kbn/setup-node-env');
// eslint-disable-next-line @kbn/imports/uniform_imports
require('./db_worker.ts');
