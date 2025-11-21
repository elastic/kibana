/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
import type { z } from '@kbn/zod/v4';
import { addMeta } from '@kbn/connector-specs/src/connector_spec_ui';
import { type DiscriminatedUnionWidgetProps } from './discriminated_union_widget';
import { getFieldsFromSchema, renderField } from '../../../field_builder';

// This widget represents an object inside a discriminated union. For example, given an initial schema like:
// z.discriminatedUnion('type', [
//   z.object({ type: z.literal('none') }),
//   z.object({ type: z.literal('basic'), token: z.string() })
// ])
//
// in SingleOptionUnionWidget component,
//   the options prop will be either `z.object({ type: z.literal('none') })` or `z.object({ type: z.literal('basic'), token: z.string() })`

export const SingleOptionUnionWidget: React.FC<DiscriminatedUnionWidgetProps> = ({
  path: rootPath,
  options,
  discriminatorKey,
  fieldConfig,
  fieldProps,
  formConfig,
}) => {
  const optionSchema = options[0];

  if (!optionSchema) {
    throw new Error(`SingleOptionUnionWidget requires an option in schema at path: ${rootPath}`);
  }

  // Hide the discriminator field since its value is implied by the selected option
  // E.g., if the option is { type: z.literal('basic'), token: z.string() }, then the 'type' field should be hidden
  addMeta(optionSchema.shape[discriminatorKey] as z.ZodType, {
    hidden: true,
    readOnly: true,
  });

  const fields = getFieldsFromSchema({
    schema: optionSchema,
    rootPath,
    formConfig,
  });

  return fields.map((field) => renderField({ field }));
};
