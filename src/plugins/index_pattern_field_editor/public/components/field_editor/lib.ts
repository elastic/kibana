/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

import { ValidationFunc, FieldConfig } from '../../shared_imports';
import type { Field } from '../../types';
import type { Context } from '../field_editor_context';
import { schema } from './form_schema';
import type { Props } from './field_editor';

const createNameNotAllowedValidator =
  (namesNotAllowed: Context['namesNotAllowed']): ValidationFunc<{}, string, string> =>
  ({ value }) => {
    if (namesNotAllowed.fields.includes(value)) {
      return {
        message: i18n.translate(
          'indexPatternFieldEditor.editor.runtimeFieldsEditor.existRuntimeFieldNamesValidationErrorMessage',
          {
            defaultMessage: 'A field with this name already exists.',
          }
        ),
      };
    } else if (namesNotAllowed.runtimeComposites.includes(value)) {
      return {
        message: i18n.translate(
          'indexPatternFieldEditor.editor.runtimeFieldsEditor.existCompositeNamesValidationErrorMessage',
          {
            defaultMessage: 'A runtime composite with this name already exists.',
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
  namesNotAllowed?: Context['namesNotAllowed'],
  field?: Props['field']
): FieldConfig<string, Field> => {
  const nameFieldConfig = schema.name as FieldConfig<string, Field>;

  if (!namesNotAllowed) {
    return nameFieldConfig;
  }

  const filterOutCurrentFieldName = (name: string) => name !== field?.name;

  // Add validation to not allow duplicates
  return {
    ...nameFieldConfig!,
    validations: [
      ...(nameFieldConfig.validations ?? []),
      {
        validator: createNameNotAllowedValidator({
          fields: namesNotAllowed.fields.filter(filterOutCurrentFieldName),
          runtimeComposites: namesNotAllowed.runtimeComposites.filter(filterOutCurrentFieldName),
        }),
      },
    ],
  };
};
