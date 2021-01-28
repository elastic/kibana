/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { FormSchema, fieldValidators, RuntimeType } from '../../shared_imports';
import { ComboBoxOption } from '../../types';
import { RUNTIME_FIELD_OPTIONS } from './constants';
import type { FieldFormInternal } from './field_editor';

const { emptyField } = fieldValidators;

export const schema: FormSchema<FieldFormInternal> = {
  name: {
    label: i18n.translate('indexPatternFieldEditor.editor.form.nameLabel', {
      defaultMessage: 'Name',
    }),
    validations: [
      {
        validator: emptyField(
          i18n.translate(
            'indexPatternFieldEditor.editor.form.validations.nameIsRequiredErrorMessage',
            {
              defaultMessage: 'Give a name to the field.',
            }
          )
        ),
      },
    ],
  },
  type: {
    label: i18n.translate('indexPatternFieldEditor.editor.form.runtimeTypeLabel', {
      defaultMessage: 'Type',
    }),
    defaultValue: 'keyword',
    deserializer: (fieldType?: RuntimeType | string) => {
      if (!fieldType) {
        return [];
      }

      const label = RUNTIME_FIELD_OPTIONS.find(({ value }) => value === fieldType)?.label;
      return [{ label: label ?? fieldType, value: fieldType }];
    },
    serializer: (value: Array<ComboBoxOption<RuntimeType>>) => value[0].value!,
  },
  script: {
    source: {
      label: i18n.translate('indexPatternFieldEditor.editor.form.defineFieldLabel', {
        defaultMessage: 'Define script (optional)',
      }),
    },
  },
  __meta__: {
    isCustomLabelVisible: {
      defaultValue: false,
    },
    isValueVisible: {
      defaultValue: false,
    },
    isFormatVisible: {
      defaultValue: false,
    },
  },
};
