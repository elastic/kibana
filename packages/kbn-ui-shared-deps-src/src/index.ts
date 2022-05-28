/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { distDir, jsFilename, cssDistFilename, externals } from './definitions';

/**
 * Absolute path to the distributable directory
 */
export { distDir };

/**
 * Filename of the main bundle file in the distributable directory
 */
export { jsFilename };

/**
 * Filename of the main bundle file in the distributable directory
 */
export { cssDistFilename };

/**
 * Externals mapping inteded to be used in a webpack config
 */
export { externals };
