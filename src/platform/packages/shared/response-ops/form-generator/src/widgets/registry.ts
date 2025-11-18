/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
import { z } from '@kbn/zod/v4';
import { TextField } from './fields/text_field';
import { SelectField } from './fields/select_field';
import { PasswordField } from './fields/password_field';
import { DiscriminatedUnionField } from './fields/discriminated_union_field';
import { KeyValueField } from './fields/key_value_field';
import { WidgetType, type BaseWidgetProps } from './types';
import { getMeta } from '../schema_metadata';

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

export function getWidgetComponent(schema: z.ZodTypeAny): React.ComponentType<BaseWidgetProps> {
  const { widget } = getMeta(schema);

  if (widget) {
    const component = WIDGET_REGISTRY[widget as WidgetType];
    if (!component) {
      throw new Error(
        `Widget "${widget}" specified in ${schema.def.type} metadata is not registered in the widget registry.`
      );
    }

    return component;
  }

  const defaultWidget = getDefaultWidgetForSchema(schema);
  if (defaultWidget) {
    return WIDGET_REGISTRY[defaultWidget];
  }

  throw new Error(
    `No widget found for schema type: ${schema.def.type}. Please specify a widget in the schema metadata.`
  );
}

const getDefaultWidgetForSchema = (schema: z.ZodTypeAny) => {
  if (schema instanceof z.ZodString) {
    const metaInfo = getMeta(schema);
    if (metaInfo?.sensitive) {
      return WidgetType.Password;
    }
    return WidgetType.Text;
  } else if (schema instanceof z.ZodEnum) {
    return WidgetType.Select;
  } else if (schema instanceof z.ZodDiscriminatedUnion) {
    return WidgetType.FormFieldset;
  } else if (schema instanceof z.ZodRecord) {
    return WidgetType.KeyValue;
  }

  return undefined;
};
