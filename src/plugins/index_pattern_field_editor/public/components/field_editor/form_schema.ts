/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { fieldValidators } from '../../shared_imports';

import { RUNTIME_FIELD_OPTIONS } from './constants';

const { emptyField, numberGreaterThanField } = fieldValidators;

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
    ],
  },
  type: {
    label: i18n.translate('indexPatternFieldEditor.editor.form.runtimeTypeLabel', {
      defaultMessage: 'Type',
    }),
    defaultValue: [RUNTIME_FIELD_OPTIONS[0]],
  },
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
