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
import { DiscriminatedUnionField } from './discriminated_union_field';
import { KeyValueField } from './key_value_field';

export type WidgetType = 'text' | 'password' | 'select' | 'formFieldset' | 'keyValue';

export const WIDGET_REGISTRY: Partial<Record<WidgetType, React.ComponentType<any>>> = {
  text: TextField,
  password: PasswordField,
  select: SelectField,
  formFieldset: DiscriminatedUnionField,
  keyValue: KeyValueField,
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
} from './discriminated_union_field';
export type { TextWidgetMeta, TextWidgetProps } from './text_field';
export type { PasswordWidgetMeta, PasswordWidgetProps } from './password_field';
export type { SelectWidgetMeta, SelectWidgetProps } from './select_field';
export type { KeyValueWidgetMeta, KeyValueWidgetProps } from './key_value_field';
export type {
  FormFieldsetWidgetMeta,
  DiscriminatedUnionWidgetProps,
} from './discriminated_union_field';
export { isTextWidgetMeta } from './text_field';
export { isPasswordWidgetMeta } from './password_field';
export { isSelectWidgetMeta } from './select_field';
export { isKeyValueWidgetMeta } from './key_value_field';
export { isFormFieldsetWidgetMeta } from './discriminated_union_field';
