/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { ComponentType } from 'react';
import { FieldHook, FIELD_TYPES } from '../hook_form_lib';

interface Props {
  field: FieldHook;
  euiFieldProps?: { [key: string]: any };
  [key: string]: any;
}

import {
  TextField,
  TextAreaField,
  NumericField,
  CheckBoxField,
  ComboBoxField,
  MultiSelectField,
  RadioGroupField,
  RangeField,
  SelectField,
  SuperSelectField,
  ToggleField,
  JsonEditorField,
  ButtonGroupField,
  MultiButtonGroupField,
  DatePickerField,
  PasswordField,
  HiddenField,
} from './fields';

const mapTypeToFieldComponent: { [key: string]: ComponentType<any> } = {
  [FIELD_TYPES.TEXT]: TextField,
  [FIELD_TYPES.TEXTAREA]: TextAreaField,
  [FIELD_TYPES.NUMBER]: NumericField,
  [FIELD_TYPES.CHECKBOX]: CheckBoxField,
  [FIELD_TYPES.COMBO_BOX]: ComboBoxField,
  [FIELD_TYPES.MULTI_SELECT]: MultiSelectField,
  [FIELD_TYPES.RADIO_GROUP]: RadioGroupField,
  [FIELD_TYPES.RANGE]: RangeField,
  [FIELD_TYPES.SELECT]: SelectField,
  [FIELD_TYPES.SUPER_SELECT]: SuperSelectField,
  [FIELD_TYPES.TOGGLE]: ToggleField,
  [FIELD_TYPES.JSON]: JsonEditorField,
  [FIELD_TYPES.BUTTON_GROUP]: ButtonGroupField,
  [FIELD_TYPES.MULTI_BUTTON_GROUP]: MultiButtonGroupField,
  [FIELD_TYPES.DATE_PICKER]: DatePickerField,
  [FIELD_TYPES.PASSWORD]: PasswordField,
  [FIELD_TYPES.HIDDEN]: HiddenField,
};

export const Field = (props: Props) => {
  const FieldComponent = mapTypeToFieldComponent[props.field.type] || TextField;
  return <FieldComponent {...props} />;
};
