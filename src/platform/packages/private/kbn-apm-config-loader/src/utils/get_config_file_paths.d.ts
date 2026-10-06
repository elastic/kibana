/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Return the configuration files that needs to be loaded.
 *
 * This mimics the behavior of the `src/cli/serve/serve.js` cli script by reading
 * `-c` and `--config` options from process.argv, and fallbacks to `@kbn/utils`'s `getConfigPath()`
 */
export declare const getConfigurationFilePaths: (argv: string[]) => string[];
