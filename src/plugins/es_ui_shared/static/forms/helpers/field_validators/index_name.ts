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

// Note: we can't import from "ui/indices" as the TS Type definition don't exist
// import { INDEX_ILLEGAL_CHARACTERS_VISIBLE } from 'ui/indices';
import { ValidationFunc } from '../../hook_form_lib';
import { startsWith, containsChars } from '../../../validators/string';
import { ERROR_CODE } from './types';

const INDEX_ILLEGAL_CHARACTERS = ['\\', '/', '?', '"', '<', '>', '|', '*'];

export const indexNameField = (i18n: any) => (
  ...args: Parameters<ValidationFunc>
): ReturnType<ValidationFunc<any, ERROR_CODE>> => {
  const [{ value }] = args;

  if (startsWith('.')(value as string)) {
    return {
      code: 'ERR_FIELD_FORMAT',
      formatType: 'INDEX_NAME',
      message: i18n.translate('esUi.forms.fieldValidation.indexNameStartsWithDotError', {
        defaultMessage: 'The index name cannot start with a dot (.).',
      }),
    };
  }

  const { doesContain: doesContainSpaces } = containsChars(' ')(value as string);
  if (doesContainSpaces) {
    return {
      code: 'ERR_FIELD_FORMAT',
      formatType: 'INDEX_NAME',
      message: i18n.translate('esUi.forms.fieldValidation.indexNameSpacesError', {
        defaultMessage: 'The index name cannot contain spaces.',
      }),
    };
  }

  const { charsFound, doesContain } = containsChars(INDEX_ILLEGAL_CHARACTERS)(value as string);
  if (doesContain) {
    return {
      message: i18n.translate('esUi.forms.fieldValidation.indexNameInvalidCharactersError', {
        defaultMessage:
          'The index name contains the invalid {characterListLength, plural, one {character} other {characters}} { characterList }.',
        values: {
          characterList: charsFound.join(' '),
          characterListLength: charsFound.length,
        },
      }),
    };
  }
};
