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

export const BINARY_TYPE_NOT_SUPPORTED = i18n.translate('autocomplete.invalidBinaryType', {
  defaultMessage: 'Binary fields are currently unsupported',
});
export const FIELD_SPACE_WARNING = i18n.translate('autocomplete.fieldSpaceWarning', {
  defaultMessage: "Warning: Spaces at the start or end of this value aren't being displayed.",
});

export const LISTS_TOOLTIP_INFO = i18n.translate('autocomplete.listsTooltipWarning', {
  defaultMessage: "Lists that aren't able to be processed by this rule type will be disabled.",
});

export const SEE_DOCUMENTATION = i18n.translate('autocomplete.seeDocumentation', {
  defaultMessage: 'See Documentation',
});

export const FIELD_CONFLICT_INDICES_WARNING_TITLE = i18n.translate(
  'autocomplete.conflictIndicesWarning.title',
  {
    defaultMessage: 'Mapping Conflict',
  }
);

export const FIELD_CONFLICT_INDICES_WARNING_DESCRIPTION = i18n.translate(
  'autocomplete.conflictIndicesWarning.description',
  {
    defaultMessage: 'This field is defined as several types across different indices.',
  }
);

export const CONFLICT_INDEX_DESCRIPTION = (name: string, count: number): string =>
  i18n.translate('autocomplete.conflictIndicesWarning.index.description', {
    defaultMessage: `{name}${count > 1 ? ' ({count} indices)' : ''}`,
    values: { count, name },
  });

// eslint-disable-next-line import/no-default-export
export default {
  LOADING,
  SELECT_FIELD_FIRST,
  FIELD_REQUIRED_ERR,
  NUMBER_ERR,
  DATE_ERR,
  FIELD_SPACE_WARNING,
  BINARY_TYPE_NOT_SUPPORTED,
};
