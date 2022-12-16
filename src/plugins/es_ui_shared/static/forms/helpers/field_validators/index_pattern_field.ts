/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { validateDataView } from '@kbn/data-views-plugin/public';
import { ValidationFunc } from '../../hook_form_lib';
import { containsChars } from '../../../validators/string';
import { ERROR_CODE } from './types';

export const indexPatternField =
  (i18n: any) =>
  (...args: Parameters<ValidationFunc>): ReturnType<ValidationFunc<any, ERROR_CODE>> => {
    const [{ value }] = args;

    if (typeof value !== 'string') {
      return;
    }

    // Validate it does not contain spaces
    const { doesContain } = containsChars(' ')(value);

    if (doesContain) {
      return {
        code: 'ERR_FIELD_FORMAT',
        formatType: 'INDEX_PATTERN',
        message: i18n.translate('esUi.forms.fieldValidation.indexPatternSpacesError', {
          defaultMessage: 'The index pattern cannot contain spaces.',
        }),
      };
    }

    // Validate illegal characters
    const errors = validateDataView(value);

    if (errors.ILLEGAL_CHARACTERS) {
      return {
        code: 'ERR_FIELD_FORMAT',
        formatType: 'INDEX_PATTERN',
        message: i18n.translate('esUi.forms.fieldValidation.indexPatternInvalidCharactersError', {
          defaultMessage:
            'The index pattern contains the invalid {characterListLength, plural, one {character} other {characters}} { characterList }.',
          values: {
            characterList: errors.ILLEGAL_CHARACTERS.join(' '),
            characterListLength: errors.ILLEGAL_CHARACTERS.length,
          },
        }),
      };
    }
  };
