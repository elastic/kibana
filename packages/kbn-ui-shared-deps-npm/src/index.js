/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const Path = require('path');

/**
 * Absolute path to the distributable directory
 */
exports.distDir = Path.resolve(__dirname, '../shared_built_assets');

/**
 * Path to dll manifest of modules included in this bundle
 */
exports.dllManifestPath = Path.resolve(exports.distDir, 'kbn-ui-shared-deps-npm-manifest.json');

/**
 * Filename of the main bundle file in the distributable directory
 */
exports.dllFilename = 'kbn-ui-shared-deps-npm.dll.js';

/**
 * Filename of the light-theme css file in the distributable directory
 */
exports.lightCssDistFilename = 'kbn-ui-shared-deps-npm.v7.light.css';

/**
 * Filename of the light-theme css file in the distributable directory
 */
exports.lightV8CssDistFilename = 'kbn-ui-shared-deps-npm.v8.light.css';

/**
 * Filename of the dark-theme css file in the distributable directory
 */
exports.darkCssDistFilename = 'kbn-ui-shared-deps-npm.v7.dark.css';

/**
 * Filename of the dark-theme css file in the distributable directory
 */
exports.darkV8CssDistFilename = 'kbn-ui-shared-deps-npm.v8.dark.css';

/**
 * Webpack loader for configuring the public path lookup from `window.__kbnPublicPath__`.
 */
exports.publicPathLoader = require.resolve('./public_path_loader');
