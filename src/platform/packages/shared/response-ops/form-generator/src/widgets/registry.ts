/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
import { TextField } from './fields/text_field';
import { SelectField } from './fields/select_field';
import { PasswordField } from './fields/password_field';
import { DiscriminatedUnionField } from './fields/discriminated_union_field';
import { KeyValueField } from './fields/key_value_field';
import { WidgetType, type BaseWidgetProps } from './types';

const widgetComponents = {
  [WidgetType.Text]: TextField,
  [WidgetType.Password]: PasswordField,
  [WidgetType.Select]: SelectField,
  [WidgetType.FormFieldset]: DiscriminatedUnionField,
  [WidgetType.KeyValue]: KeyValueField,
} as const;

export const WIDGET_REGISTRY: Record<
  WidgetType,
  React.ComponentType<BaseWidgetProps>
> = widgetComponents as Record<WidgetType, React.ComponentType<BaseWidgetProps>>;

export function getWidget(
  widgetType: WidgetType | string
): React.ComponentType<BaseWidgetProps> | undefined {
  return WIDGET_REGISTRY[widgetType as WidgetType];
}
