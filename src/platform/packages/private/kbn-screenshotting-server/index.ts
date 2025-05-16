/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { args } from './src/args';
export { ChromiumArchivePaths, type PackageInfo } from './src/paths';
export { getChromiumPackage } from './src/get_chromium_package';
export { type ConfigType, createConfig, config, durationToNumber } from './src/config';
export { ConfigSchema } from './src/config/schema';
