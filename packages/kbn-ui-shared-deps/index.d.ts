/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

/**
 * Absolute path to the distributable directory
 */
export const distDir: string;

/**
 * Filename of the main bundle file in the distributable directory
 */
export const jsFilename: string;

/**
 * Filename of files that must be loaded before the jsFilename
 */
export const jsDepFilenames: string[];

/**
 * Filename of the unthemed css file in the distributable directory
 */
export const baseCssDistFilename: string;

/**
 * Filename of the dark-theme css file in the distributable directory
 */
export const darkCssDistFilename: string;

/**
 * Filename of the dark-theme css file in the distributable directory
 */
export const darkV8CssDistFilename: string;

/**
 * Filename of the light-theme css file in the distributable directory
 */
export const lightCssDistFilename: string;

/**
 * Filename of the light-theme css file in the distributable directory
 */
export const lightV8CssDistFilename: string;

/**
 * Externals mapping inteded to be used in a webpack config
 */
export const externals: {
  [key: string]: string;
};

/**
 * Webpack loader for configuring the public path lookup from `window.__kbnPublicPath__`.
 */
export const publicPathLoader: string;
