/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isEmpty } from 'lodash';
import { i18n } from '@kbn/i18n';
import type { DataViewField } from '@kbn/data-views-plugin/common';
import { KBN_FIELD_TYPES } from '@kbn/data-plugin/public';
import { Filter, isCombinedFilter } from '@kbn/es-query';
import { validateParams } from './filter_editor_utils';

export const strings = {
  getInvalidDateFormatProvidedErrorMessage: () =>
    i18n.translate('unifiedSearch.filter.filterBar.invalidDateFormatProvidedErrorMessage', {
      defaultMessage: 'Invalid date format provided',
    }),
};

export const getFieldValidityAndErrorMessage = (
  field: DataViewField,
  value?: string | undefined
): { isInvalid: boolean; errorMessage?: string } => {
  const type = field?.type;
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
    errorMessage: strings.getInvalidDateFormatProvidedErrorMessage(),
  };
};

export const flattenFilters = (filter: Filter[]) => {
  const returnArray: Filter[] = [];
  const flattenFilterRecursively = (f: Filter) => {
    if (isCombinedFilter(f)) {
      f.meta.params.forEach(flattenFilterRecursively);
    } else if (f) {
      returnArray.push(f);
    }
  };

  filter.forEach(flattenFilterRecursively);

  return returnArray;
};

export const MIDDLE_TRUNCATION_PROPS = { truncation: 'middle' as const };
export const SINGLE_SELECTION_AS_TEXT_PROPS = { asPlainText: true };
