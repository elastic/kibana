/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

/*
 * CSS class name used for the styling of highlighted requests
 */
export const SELECTED_REQUESTS_CLASSNAME = 'console__monaco_editor__selectedRequests';

export const whitespacesRegex = /\s+/;
export const newLineRegex = /\n/;
export const slashRegex = /\//;
export const ampersandRegex = /&/;
export const equalsSignRegex = /=/;
export const questionMarkRegex = /\?/;
export const variableTemplateRegex = /\${(\w+)}/g;
export const numberStartRegex = /[-\d]/;
export const digitRegex = /[\d]/;
export const END_OF_URL_TOKEN = '__url_path_end__';

/*
 * This regex matches a string that has a method, for example "GET ".
 * In this case autocomplete suggestions should be triggered for an url.
 */
export const shouldAutocompleteUrlRegex = /^\s*(GET|POST|PUT|PATCH|DELETE)\s+$/i;
/*
 * This regex matches a string that has
 * a method and some parts of an url ending with a slash, a question mark or an equals sign,
 * for example "GET _search/", "GET _search?", "GET _search?param=".
 * In this case autocomplete suggestions should be triggered for an url part or param.
 */
export const shouldAutocompleteUrlPartRegex =
  /^\s*(GET|POST|PUT|PATCH|DELETE)\s+[a-z0-9\/._?=&]*[?=\/]$/i;
/*
 * This regex matches a string that has
 * optional whitespace characters and a double quote, for example `  "`.
 * In this case autocomplete suggestions should be triggered for a property name.
 */
export const shouldAutocompletePropertyNameRegex = /^\s*"$/;
/*
 * This regex matches a string that has
 * a property name, a colon and an optional double quote, for example `"query" : "`.
 * In this case autocomplete suggestions should be triggered for a property value.
 */
export const shouldAutocompletePropertyValueRegex = /^\s*"[a-zA-Z0-9_]+"\s*:\s*"?$/;
/*
 * This regex matches the content after the cursor that has
 * optional chars, an optional double quote, an optional colon
 */
export const propertyNameLineAfterRegex = /\$[a-zA-Z0-9_]*"*:*\s*^/;

/*
 * i18n for autocomplete labels
 */
export const i18nTexts = {
  method: i18n.translate('console.autocompleteSuggestions.methodLabel', {
    defaultMessage: 'method',
  }),
  endpoint: i18n.translate('console.autocompleteSuggestions.endpointLabel', {
    defaultMessage: 'endpoint',
  }),
  param: i18n.translate('console.autocompleteSuggestions.paramLabel', {
    defaultMessage: 'param',
  }),
  api: i18n.translate('console.autocompleteSuggestions.apiLabel', {
    defaultMessage: 'API',
  }),
};

export enum AutocompleteType {
  PATH = 'path',
  URL_PARAMS = 'url_params',
  METHOD = 'method',
  BODY = 'body',
}
