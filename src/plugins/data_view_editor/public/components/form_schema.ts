/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { fieldValidators, ValidationFunc } from '../shared_imports';
import { INDEX_PATTERN_TYPE } from '../types';

export const singleAstriskValidator = (
  ...args: Parameters<ValidationFunc>
): ReturnType<ValidationFunc> => {
  const [{ value, path }] = args;

  const message = i18n.translate('indexPatternEditor.validations.noSingleAstriskPattern', {
    defaultMessage: "A single '*' is not an allowed index pattern",
  });

  return value === '*' ? { code: 'ERR_FIELD_MISSING', path, message } : undefined;
};

export const schema = {
  title: {
    label: i18n.translate('indexPatternEditor.editor.form.titleLabel', {
      defaultMessage: 'Name',
    }),
    defaultValue: '',
    helpText: i18n.translate('indexPatternEditor.validations.titleHelpText', {
      defaultMessage:
        'Enter an index pattern that matches one or more data sources. Use an asterisk (*) to match multiple characters. Spaces and the characters , /, ?, ", <, >, | are not allowed.',
    }),
    validations: [
      {
        validator: fieldValidators.emptyField(
          i18n.translate('indexPatternEditor.validations.titleIsRequiredErrorMessage', {
            defaultMessage: 'A name is required.',
          })
        ),
      },
      {
        validator: singleAstriskValidator,
      },
    ],
  },
  timestampField: {
    label: i18n.translate('indexPatternEditor.editor.form.timeFieldLabel', {
      defaultMessage: 'Timestamp field',
    }),
    helpText: i18n.translate('indexPatternEditor.editor.form.timestampFieldHelp', {
      defaultMessage: 'Select a timestamp field for use with the global time filter.',
    }),
    validations: [],
  },
  allowHidden: {
    label: i18n.translate('indexPatternEditor.editor.form.allowHiddenLabel', {
      defaultMessage: 'Allow hidden and system indices',
    }),
    defaultValue: false,
  },
  id: {
    label: i18n.translate('indexPatternEditor.editor.form.customIdLabel', {
      defaultMessage: 'Custom data view ID',
    }),
    helpText: i18n.translate('indexPatternEditor.editor.form.customIdHelp', {
      defaultMessage:
        'Kibana provides a unique identifier for each data view, or you can create your own.',
    }),
  },
  type: {
    label: i18n.translate('indexPatternEditor.editor.form.TypeLabel', {
      defaultMessage: 'Data view type',
    }),
    defaultValue: INDEX_PATTERN_TYPE.DEFAULT,
  },
};
