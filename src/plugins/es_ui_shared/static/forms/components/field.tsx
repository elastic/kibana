/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
};

export const Field = (props: Props) => {
  const FieldComponent = mapTypeToFieldComponent[props.field.type] || TextField;
  return <FieldComponent {...props} />;
};
