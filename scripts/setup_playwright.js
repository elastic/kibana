/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * This file is intended to be required before Playwright runs. It is responsible
 * for:
 * - Calling setup_node_env which registers babel transforms, source map support,
 * hardening etc
 * - Initializing APM/OpenTelemetry
 * - Transforming logging-related command-line flags into an environment variable
 * so it doesn't interfere with Playwright's own command-line flags
 */

/**
 * We disable node's version validation here as some IDEs will bundle their own
 * Node.js version for extensions, or there's no way to get it to use Kibana's
 * version, and it would cause the version validation check in setup_node_env to
 * fail if the versions are out of sync.
 */
process.env.UNSAFE_DISABLE_NODE_VERSION_VALIDATION = 'true';
require('../src/setup_node_env');
