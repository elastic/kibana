/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ValidationFunc } from '../../hook_form_lib';
import { containsChars } from '../../validators/string';
import { ERROR_CODE } from './types';

// --- start copy from Dataview plugin

// Will need to be importe from a future data view package

const ILLEGAL_CHARACTERS_VISIBLE = ['\\', '/', '?', '"', '<', '>', '|'];
const ILLEGAL_CHARACTERS_KEY = 'ILLEGAL_CHARACTERS';
const CONTAINS_SPACES_KEY = 'CONTAINS_SPACES';

function dataViewContainsSpaces(indexPattern: string): boolean {
  return indexPattern.includes(' ');
}

function findIllegalCharacters(indexPattern: string): string[] {
  const illegalCharacters = ILLEGAL_CHARACTERS_VISIBLE.reduce((chars: string[], char: string) => {
    if (indexPattern.includes(char)) {
      chars.push(char);
    }
    return chars;
  }, []);

  return illegalCharacters;
}

/**
 * Validate index pattern strings
 * @public
 * @param indexPattern string to validate
 * @returns errors object
 */

export function validateDataView(indexPattern: string) {
  const errors: { [ILLEGAL_CHARACTERS_KEY]?: string[]; [CONTAINS_SPACES_KEY]?: boolean } = {};

  const illegalCharacters = findIllegalCharacters(indexPattern);

  if (illegalCharacters.length) {
    errors[ILLEGAL_CHARACTERS_KEY] = illegalCharacters;
  }

  if (dataViewContainsSpaces(indexPattern)) {
    errors[CONTAINS_SPACES_KEY] = true;
  }

  return errors;
}
// --- end copy

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
