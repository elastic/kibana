/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { z } from '@kbn/zod/v4';
import type { EuiFormFieldsetProps } from '@elastic/eui';
import { SingleOptionUnionField } from './single_option_field';
import type { BaseWidgetPropsWithOptions } from '../../types';
import { MultiOptionUnionField } from './multi_option_field';

type DiscriminatedUnionSchemaType = z.ZodDiscriminatedUnion<z.ZodObject<z.ZodRawShape>[]>;

export type DiscriminatedUnionWithProps = BaseWidgetPropsWithOptions<
  DiscriminatedUnionSchemaType,
  EuiFormFieldsetProps,
  z.ZodObject<z.ZodRawShape>
> & {
  discriminatorKey: string;
};

export const getDiscriminatorKey = (schema: z.ZodDiscriminatedUnion): string => {
  return (schema as unknown as { _def: { discriminator: string } })._def.discriminator;
};

export const getDiscriminatorFieldValue = (
  schema: z.ZodObject<z.ZodRawShape>,
  discriminatorKey: string
) => {
  return (schema.shape[discriminatorKey] as z.ZodLiteral).value;
};

export const DiscriminatedUnionField: React.FC<DiscriminatedUnionWithProps> = (props) => {
  const { schema, path } = props;
  const options = schema.options;

  if (!options) {
    throw new Error(`DiscriminatedUnionField requires options in schema at path: ${path}`);
  }

  const discriminatorKey = getDiscriminatorKey(schema);

  return options.length === 1 ? (
    <SingleOptionUnionField {...props} options={options} discriminatorKey={discriminatorKey} />
  ) : (
    <MultiOptionUnionField {...props} options={options} discriminatorKey={discriminatorKey} />
  );
};
