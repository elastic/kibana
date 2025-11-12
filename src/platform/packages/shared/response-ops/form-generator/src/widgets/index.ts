/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
import { TextField } from './text_field';
import { SelectField } from './select_field';
import { PasswordField } from './password_field';
import { DiscriminatedUnionField } from './discriminated_union_field/discriminated_union_field';
import { KeyValueField } from './key_value_field';
import type { UIMetadata } from '../connector_spec_ui';

export type WidgetType = NonNullable<UIMetadata['widget']>;

export const WIDGET_REGISTRY: Partial<Record<WidgetType, React.ComponentType<any>>> = {
  text: TextField,
  password: PasswordField,
  select: SelectField,
  formFieldset: DiscriminatedUnionField,
  keyValue: KeyValueField,
  // TODO: Add more widgets as they are implemented:
  // textarea: TextAreaField,
  // json: JsonField,
  // code: CodeField,
  // number: NumberField,
  // multiSelect: MultiSelectField,
  // toggle: ToggleField,
  // date: DateField,
  // dateTime: DateTimeField,
  // fileUpload: FileUploadField,
};

export function getWidget(widgetType: WidgetType): React.ComponentType<any> | undefined {
  return WIDGET_REGISTRY[widgetType];
}

export { TextField } from './text_field';
export { SelectField } from './select_field';
export { PasswordField } from './password_field';
export { KeyValueField } from './key_value_field';
export {
  DiscriminatedUnionField,
  getDiscriminatedUnionInitialValue,
} from './discriminated_union_field/discriminated_union_field';
export type {
  WidgetProps,
  TextWidgetProps,
  SelectWidgetProps,
  DiscriminatedUnionWidgetProps,
  KeyValueWidgetProps,
} from './widget_props';
