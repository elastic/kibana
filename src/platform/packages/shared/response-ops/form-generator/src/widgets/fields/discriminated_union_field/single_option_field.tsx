/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
import { type DiscriminatedUnionWithProps } from './discriminated_union_field';
import { getFieldsFromSchema, renderFieldComponent } from '../../../form';

// This widget represents an object inside a discriminated union. For example, given an initial schema like:
// z.discriminatedUnion('type', [
//   z.object({ type: z.literal('none') }),
//   z.object({ type: z.literal('basic'), token: z.string() })
// ])
//
// in SingleOptionUnionField component,
//   the options prop will be either `z.object({ type: z.literal('none') })` or `z.object({ type: z.literal('basic'), token: z.string() })`

export const SingleOptionUnionField: React.FC<DiscriminatedUnionWithProps> = ({
  path: rootPath,
  options,
  discriminatorKey,
  schema,
  fieldConfig,
  fieldProps,
}) => {
  const option = options[0];
  const optionSchema = option.omit({ [discriminatorKey]: true });

  if (!optionSchema) {
    throw new Error(`SingleOptionUnionField requires an option in schema at path: ${rootPath}`);
  }

  const fields = getFieldsFromSchema({
    schema: optionSchema,
    rootPath,
  });
  return fields.map((field) => renderFieldComponent({ field }));
};
