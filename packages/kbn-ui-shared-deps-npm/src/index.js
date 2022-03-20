/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * @typedef {'v8'} ThemeVersion
 */

const Path = require('path');

// extracted const vars
const distDir = Path.resolve(__dirname, '../shared_built_assets');
const dllManifestPath = Path.resolve(distDir, 'kbn-ui-shared-deps-npm-manifest.json');
const dllFilename = 'kbn-ui-shared-deps-npm.dll.js';
const publicPathLoader = require.resolve('./public_path_loader');

/**
 * Absolute path to the distributable directory
 */
exports.distDir = distDir;

/**
 * Path to dll manifest of modules included in this bundle
 */
exports.dllManifestPath = dllManifestPath;

/**
 * Filename of the main bundle file in the distributable directory
 */
exports.dllFilename = dllFilename;

/**
 * Filename of the light-theme css file in the distributable directory
 * @param {ThemeVersion} themeVersion
 */
exports.lightCssDistFilename = (themeVersion) => {
  if (themeVersion !== 'v8') {
    throw new Error(`unsupported theme version [${themeVersion}]`);
  }

  return 'kbn-ui-shared-deps-npm.v8.light.css';
};

/**
 * Filename of the dark-theme css file in the distributable directory
 * @param {ThemeVersion} themeVersion
 */
exports.darkCssDistFilename = (themeVersion) => {
  if (themeVersion !== 'v8') {
    throw new Error(`unsupported theme version [${themeVersion}]`);
  }

  return 'kbn-ui-shared-deps-npm.v8.dark.css';
};

/**
 * Webpack loader for configuring the public path lookup from `window.__kbnPublicPath__`.
 */
exports.publicPathLoader = publicPathLoader;
