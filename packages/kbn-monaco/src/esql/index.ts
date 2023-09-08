/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export { ESQL_LANG_ID, ESQL_THEME_ID } from './lib/constants';
export { ESQLLang } from './language';
export type { ESQLCustomAutocompleteCallbacks } from './lib/autocomplete/types';
export { buildESQlTheme } from './lib/monaco/esql_theme';
