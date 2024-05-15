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
