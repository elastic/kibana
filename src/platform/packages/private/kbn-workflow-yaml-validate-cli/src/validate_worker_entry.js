/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Worker threads start a fresh module context that has not registered Kibana's
// on-the-fly TypeScript transpiler, so install it before loading the TS worker.
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('@kbn/setup-node-env');
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('./validate_worker');
