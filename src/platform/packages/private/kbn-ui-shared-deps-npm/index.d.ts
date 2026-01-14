/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type ThemeVersion = 'v8';

/**
 * Absolute path to the distributable directory.
 */
export const distDir: string;

/**
 * Path to dll manifest of modules included in this bundle.
 */
export const dllManifestPath: string;

/**
 * Filename of the main bundle file in the distributable directory.
 */
export const dllFilename: string;

/**
 * Webpack loader for configuring the public path lookup from `window.__kbnPublicPath__`.
 */
export const publicPathLoader: string;
