/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataViewField } from '@kbn/data-views-plugin/common';
import { i18n } from '@kbn/i18n';
import { KBN_FIELD_TYPES } from '@kbn/data-plugin/public';
import { isEmpty } from 'lodash';
import { validateParams } from '../filter_bar/filter_editor/lib/filter_editor_utils';

export const getFieldValidityAndErrorMessage = (
  field: DataViewField,
  value?: string | undefined
): { isInvalid: boolean; errorMessage?: string } => {
  const type = field.type;
  switch (type) {
    case KBN_FIELD_TYPES.DATE:
    case KBN_FIELD_TYPES.DATE_RANGE:
      if (!isEmpty(value) && !validateParams(value, field)) {
        return invalidFormatError();
      }
      break;
    default:
      break;
  }
  return noError();
};

const noError = (): { isInvalid: boolean } => {
  return { isInvalid: false };
};

const invalidFormatError = (): { isInvalid: boolean; errorMessage?: string } => {
  return {
    isInvalid: true,
    errorMessage: i18n.translate(
      'unifiedSearch.filter.filterBar.invalidDateFormatProvidedErrorMessage',
      {
        defaultMessage: 'Invalid date format provided',
      }
    ),
  };
};
