/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// NOTE, this types for this package are actually based on the index.js
// file, but this file is here so that when loading the source you don't
// have to set `allowJs` for your project

export type ThemeVersion = 'v8';
export const distDir: string;
export const dllManifestPath: string;
export const dllFilename: string;
export const publicPathLoader: string;
export function lightCssDistFilename(themeVersion: ThemeVersion): string;
export function darkCssDistFilename(themeVersion: ThemeVersion): string;
