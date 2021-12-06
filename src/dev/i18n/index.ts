/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// @ts-ignore
export { extractMessagesFromPathToMap } from './extract_default_translations';
// @ts-ignore
export { matchEntriesWithExctractors } from './extract_default_translations';
export { arrayify, writeFileAsync, readFileAsync, normalizePath, ErrorReporter } from './utils';
export { serializeToJson, serializeToJson5 } from './serializers';
export type { I18nConfig } from './config';
export { filterConfigPaths, assignConfigFromPath, checkConfigNamespacePrefix } from './config';
export { integrateLocaleFiles } from './integrate_locale_files';
