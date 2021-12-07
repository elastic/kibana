/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

import { ValidationFunc, FieldConfig } from '../../shared_imports';
import { Field } from '../../types';
import { schema } from './form_schema';
import type { Props } from './field_editor';

const createNameNotAllowedValidator =
  (namesNotAllowed: string[]): ValidationFunc<{}, string, string> =>
  ({ value }) => {
    if (namesNotAllowed.includes(value)) {
      return {
        message: i18n.translate(
          'indexPatternFieldEditor.editor.runtimeFieldsEditor.existRuntimeFieldNamesValidationErrorMessage',
          {
            defaultMessage: 'A field with this name already exists.',
          }
        ),
      };
    }
  };

/**
 * Dynamically retrieve the config for the "name" field, adding
 * a validator to avoid duplicated runtime fields to be created.
 *
 * @param namesNotAllowed Array of names not allowed for the field "name"
 * @param field Initial value of the form
 */
export const getNameFieldConfig = (
  namesNotAllowed?: string[],
  field?: Props['field']
): FieldConfig<string, Field> => {
  const nameFieldConfig = schema.name as FieldConfig<string, Field>;

  if (!namesNotAllowed) {
    return nameFieldConfig;
  }

  // Add validation to not allow duplicates
  return {
    ...nameFieldConfig!,
    validations: [
      ...(nameFieldConfig.validations ?? []),
      {
        validator: createNameNotAllowedValidator(
          namesNotAllowed.filter((name) => name !== field?.name)
        ),
      },
    ],
  };
};
