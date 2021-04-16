/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// Kibana already handles these events internally for graceful shutdowns.
// `src/cli/dev` is spawning Kibana in a child process to apply the preserve-symlinks options.
// We need to catch these events here to avoid killing the parent process before Kibana (the child) is fully finished.
process.on('SIGINT', function () {});
process.on('SIGTERM', function () {});

require('../src/cli/dev');
