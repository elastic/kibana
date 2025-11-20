/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import type { BaseWidgetProps } from './types';
import { WidgetType } from './types';
import { getMeta } from '../schema_metadata';
import { TextField } from './fields/text_field';
import { SelectField } from './fields/select_field';
import { PasswordField } from './fields/password_field';
import { DiscriminatedUnionField } from './fields/discriminated_union_field';

const WIDGET_REGISTRY = {
  [WidgetType.Text]: TextField,
  [WidgetType.Password]: PasswordField,
  [WidgetType.Select]: SelectField,
  [WidgetType.FormFieldset]: DiscriminatedUnionField,
};

const getDefaultWidgetForSchema = (schema: z.ZodType) => {
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
  }

  return undefined;
};

function getWidgetType(schema: z.ZodType): WidgetType | undefined {
  const { widget } = getMeta(schema);
  return (widget as WidgetType) || getDefaultWidgetForSchema(schema);
}

export function getWidgetComponent(
  schema: z.ZodType
): React.FC<BaseWidgetProps<z.ZodType, unknown, unknown>> {
  const widgetType = getWidgetType(schema);

  if (!widgetType) {
    throw new Error(
      `No widget found for schema type: ${schema.def.type}. Please specify a widget in the schema metadata.`
    );
  }

  const component = WIDGET_REGISTRY[widgetType];
  if (!component) {
    throw new Error(
      `Widget "${widgetType}" specified in ${schema.def.type} metadata is not registered in the widget registry.`
    );
  }

  return component as React.FC<BaseWidgetProps<z.ZodType, unknown, unknown>>;
}
