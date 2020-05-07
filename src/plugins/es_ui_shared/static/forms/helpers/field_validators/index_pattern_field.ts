/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { ValidationFunc } from '../../hook_form_lib';
import { containsChars } from '../../../validators/string';
import { ERROR_CODE } from './types';

import { indexPatterns } from '../../../../../data/public';

export const indexPatternField = (i18n: any) => (
  ...args: Parameters<ValidationFunc>
): ReturnType<ValidationFunc<any, ERROR_CODE>> => {
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
  const errors = indexPatterns.validate(value);

  if (errors[indexPatterns.ILLEGAL_CHARACTERS_KEY]) {
    return {
      code: 'ERR_FIELD_FORMAT',
      formatType: 'INDEX_PATTERN',
      message: i18n.translate('esUi.forms.fieldValidation.indexPatternInvalidCharactersError', {
        defaultMessage:
          'The index pattern contains the invalid {characterListLength, plural, one {character} other {characters}} { characterList }.',
        values: {
          characterList: errors[indexPatterns.ILLEGAL_CHARACTERS_KEY].join(' '),
          characterListLength: errors[indexPatterns.ILLEGAL_CHARACTERS_KEY].length,
        },
      }),
    };
  }
};
