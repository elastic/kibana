/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { fieldValidators } from '../shared_imports';

// import { RUNTIME_FIELD_OPTIONS } from './constants';

// const { emptyField, numberGreaterThanField } = fieldValidators;

export const schema = {
  title: {
    label: i18n.translate('indexPatternEditor.editor.form.titleLabel', {
      defaultMessage: 'Name',
    }),
    defaultValue: '',
    helpText:
      'Use an asterisk (*) to match multiple indices. Spaces and the characters , /, ?, ", <, >, | are not allowed.',
    validations: [
      {
        validator: fieldValidators.emptyField(
          i18n.translate('indexPatternEditor.editor.form.validations.titleIsRequiredErrorMessage', {
            defaultMessage: 'A name is required.',
          })
        ),
      },
    ],
  },
  timestampField: {
    label: i18n.translate('indexPatternEditor.editor.form.timeFieldLabel', {
      defaultMessage: 'Timestamp field',
    }),
    // defaultValue: '',
    helpText: 'Select a primary time field for use with the global time filter.',
    validations: [
      {
        validator: fieldValidators.emptyField(
          i18n.translate(
            'indexPatternEditor.editor.form.validations.timeFieldSelectionIsRequiredErrorMessage',
            {
              defaultMessage: 'A time field selection is required.',
            }
          )
        ),
      },
    ],
  },
  allowHidden: {
    label: i18n.translate('indexPatternEditor.editor.form.allowHiddenLabel', {
      defaultMessage: 'Allow hidden and system indices',
    }),
    defaultValue: false,
  },
  id: {
    label: i18n.translate('indexPatternEditor.editor.form.customIdLabel', {
      defaultMessage: 'Custom index pattern ID',
    }),
    helpText:
      'Kibana will provide a unique identifier for each index pattern. If you do not want to use this unique ID, enter a custom one.',
  },
  /*
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
  */
};
