/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { ValidationFunc } from '../../hook_form_lib';
import { ERROR_CODE } from './types';

export const starCharacterCheck =
  () =>
  (...args: Parameters<ValidationFunc>): ReturnType<ValidationFunc<any, ERROR_CODE>> => {
    const [{ value, path }] = args;

    if (typeof value === 'string' && value.includes('*')) {
      return {
        code: 'ERR_STAR_CHARACTER',
        path,
        message: i18n.translate(
          'indexPatternFieldEditor.editor.form.validations.starCharacterNotAllowedValidationErrorMessage',
          {
            defaultMessage: 'The field cannot have * in the name.',
          }
        ),
      };
    }
    return undefined;
  };
