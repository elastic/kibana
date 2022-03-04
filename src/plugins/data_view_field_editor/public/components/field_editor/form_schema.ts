/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { EuiComboBoxOptionOption } from '@elastic/eui';

import { fieldValidators, FieldConfig, RuntimeType, ValidationFunc } from '../../shared_imports';
import type { Context } from '../preview';
import { RUNTIME_FIELD_OPTIONS } from './constants';

const { containsCharsField, emptyField, numberGreaterThanField } = fieldValidators;
const i18nTexts = {
  invalidScriptErrorMessage: i18n.translate(
    'indexPatternFieldEditor.editor.form.scriptEditorPainlessValidationMessage',
    {
      defaultMessage: 'Invalid Painless script.',
    }
  ),
};

// Validate the painless **script**
const painlessScriptValidator: ValidationFunc = async ({ customData: { provider } }) => {
  const previewError = (await provider()) as Context['error'];

  if (previewError && previewError.code === 'PAINLESS_SCRIPT_ERROR') {
    return {
      message: i18nTexts.invalidScriptErrorMessage,
    };
  }
};

export const schema = {
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
              defaultMessage: 'A name is required.',
            }
          )
        ),
      },
      {
        validator: containsCharsField({
          message: i18n.translate(
            'indexPatternFieldEditor.editor.form.validations.starCharacterNotAllowedValidationErrorMessage',
            {
              defaultMessage: 'The field cannot have * in the name.',
            }
          ),
          chars: '*',
        }),
      },
    ],
  },
  type: {
    label: i18n.translate('indexPatternFieldEditor.editor.form.runtimeTypeLabel', {
      defaultMessage: 'Type',
    }),
    defaultValue: [RUNTIME_FIELD_OPTIONS[0]],
    fieldsToValidateOnChange: ['script.source'],
  } as FieldConfig<Array<EuiComboBoxOptionOption<RuntimeType>>>,
  script: {
    source: {
      label: i18n.translate('indexPatternFieldEditor.editor.form.defineFieldLabel', {
        defaultMessage: 'Define script',
      }),
      validations: [
        {
          validator: emptyField(
            i18n.translate(
              'indexPatternFieldEditor.editor.form.validations.scriptIsRequiredErrorMessage',
              {
                defaultMessage: 'A script is required to set the field value.',
              }
            )
          ),
        },
        {
          validator: painlessScriptValidator,
          isAsync: true,
        },
      ],
    },
  },
  customLabel: {
    label: i18n.translate('indexPatternFieldEditor.editor.form.customLabelLabel', {
      defaultMessage: 'Custom label',
    }),
    validations: [
      {
        validator: emptyField(
          i18n.translate(
            'indexPatternFieldEditor.editor.form.validations.customLabelIsRequiredErrorMessage',
            {
              defaultMessage: 'Give a label to the field.',
            }
          )
        ),
      },
    ],
  },
  popularity: {
    label: i18n.translate('indexPatternFieldEditor.editor.form.popularityLabel', {
      defaultMessage: 'Popularity',
    }),
    validations: [
      {
        validator: emptyField(
          i18n.translate(
            'indexPatternFieldEditor.editor.form.validations.popularityIsRequiredErrorMessage',
            {
              defaultMessage: 'Give a popularity to the field.',
            }
          )
        ),
      },
      {
        validator: numberGreaterThanField({
          than: 0,
          allowEquality: true,
          message: i18n.translate(
            'indexPatternFieldEditor.editor.form.validations.popularityGreaterThan0ErrorMessage',
            {
              defaultMessage: 'The popularity must be zero or greater.',
            }
          ),
        }),
      },
    ],
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
    isPopularityVisible: {
      defaultValue: false,
    },
  },
};
