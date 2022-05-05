/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { IFieldType } from '@kbn/data-views-plugin/common';
import { i18n } from '@kbn/i18n';
import { isEmpty } from 'lodash';
import { validateParams } from '../filter_bar/filter_editor/lib/filter_editor_utils';

export const getFieldValidityAndErrorMessage = (
  field: IFieldType,
  value?: string | undefined
): { isInvalid: boolean; errorMessage: string[] } => {
  const type = field.type;
  switch (type) {
    case 'string':
      return {
        isInvalid: !validateParams(value, field),
        errorMessage: [''],
      };
    case 'date':
    case 'date_range':
      return {
        isInvalid: !isEmpty(value) && !validateParams(value, field),
        errorMessage: [
          i18n.translate('unifiedSearch.filter.filterBar.invalidDateFormatProvidedErrorMessage', {
            defaultMessage: 'Invalid date format provided',
          }),
        ],
      };
    case 'ip':
    case 'ip_range':
      return {
        isInvalid: !isEmpty(value) && !validateParams(value, field),
        errorMessage: [''],
      };
    case 'number':
    case 'number_range':
    case 'boolean':
    default:
      return { isInvalid: false, errorMessage: [''] };
  }
};
