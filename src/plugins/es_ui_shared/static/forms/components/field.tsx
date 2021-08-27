/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { ComponentType } from 'react';
import React from 'react';
import { FIELD_TYPES } from '../hook_form_lib/constants';
import type { FieldHook } from '../hook_form_lib/types';
import { CheckBoxField } from './fields/checkbox_field';
import { ComboBoxField } from './fields/combobox_field';
import { JsonEditorField } from './fields/json_editor_field';
import { MultiSelectField } from './fields/multi_select_field';
import { NumericField } from './fields/numeric_field';
import { RadioGroupField } from './fields/radio_group_field';
import { RangeField } from './fields/range_field';
import { SelectField } from './fields/select_field';
import { SuperSelectField } from './fields/super_select_field';
import { TextAreaField } from './fields/text_area_field';
import { TextField } from './fields/text_field';
import { ToggleField } from './fields/toggle_field';

interface Props {
  field: FieldHook;
  euiFieldProps?: { [key: string]: any };
  [key: string]: any;
}

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
};

export const Field = (props: Props) => {
  const FieldComponent = mapTypeToFieldComponent[props.field.type] || TextField;
  return <FieldComponent {...props} />;
};
