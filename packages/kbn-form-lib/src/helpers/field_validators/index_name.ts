/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ValidationFunc } from '../../hook_form_lib';
import { startsWith, containsChars } from '../../validators/string';
import { ERROR_CODE } from './types';

// start copy from 'es_ui_shared/public/index' plugin

// TODO: remove copied code once es_ui_shared/index is moved to package

const ILLEGAL_CHARACTERS_VISIBLE = ['\\', '/', '?', '"', '<', '>', '|'];
const INDEX_ILLEGAL_CHARACTERS_VISIBLE = [...ILLEGAL_CHARACTERS_VISIBLE, '*'];

function indexNameBeginsWithPeriod(indexName?: string): boolean {
  if (indexName === undefined) {
    return false;
  }
  return indexName[0] === '.';
}

function findIllegalCharactersInIndexName(indexName: string): string[] {
  const illegalCharacters = INDEX_ILLEGAL_CHARACTERS_VISIBLE.reduce(
    (chars: string[], char: string): string[] => {
      if (indexName.includes(char)) {
        chars.push(char);
      }

      return chars;
    },
    []
  );

  return illegalCharacters;
}

function indexNameContainsSpaces(indexName: string): boolean {
  return indexName.includes(' ');
}

const indices = {
  INDEX_ILLEGAL_CHARACTERS_VISIBLE,
  indexNameBeginsWithPeriod,
  findIllegalCharactersInIndexName,
  indexNameContainsSpaces,
};
// end copy

export const indexNameField =
  (i18n: any) =>
  (...args: Parameters<ValidationFunc>): ReturnType<ValidationFunc<any, ERROR_CODE>> => {
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

    const { charsFound, doesContain } = containsChars(indices.INDEX_ILLEGAL_CHARACTERS_VISIBLE)(
      value as string
    );
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
