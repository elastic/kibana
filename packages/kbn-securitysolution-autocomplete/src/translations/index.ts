/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

export const LOADING = i18n.translate('autocomplete.loadingDescription', {
  defaultMessage: 'Loading...',
});

export const SELECT_FIELD_FIRST = i18n.translate('autocomplete.selectField', {
  defaultMessage: 'Please select a field first...',
});

export const FIELD_REQUIRED_ERR = i18n.translate('autocomplete.fieldRequiredError', {
  defaultMessage: 'Value cannot be empty',
});

export const NUMBER_ERR = i18n.translate('autocomplete.invalidNumberError', {
  defaultMessage: 'Not a valid number',
});

export const DATE_ERR = i18n.translate('autocomplete.invalidDateError', {
  defaultMessage: 'Not a valid date',
});

export const FILENAME_WILDCARD_WARNING = i18n.translate('autocomplete.filename.wildcardWarning', {
  defaultMessage: `A wildcard in the filename will affect the endpoint's performance`,
});

export const FILEPATH_WARNING = i18n.translate('autocomplete.filename.pathWarning', {
  defaultMessage: `Path may be formed incorrectly; verify value`,
});
