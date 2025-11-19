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
import type { BaseMetadata } from '../../../schema_metadata';
import { getMeta } from '../../../schema_metadata';
import { SingleOptionUnionField } from './single_option_field';
import { MultiOptionUnionField } from './multi_option_field';
import type { BaseWidgetProps, WidgetType } from '../../types';
import { getDefaultValuesFromSchema } from './get_default_values';

export interface UnionOptionField {
  id: string;
  schema: z.ZodTypeAny;
  meta: BaseMetadata;
}

export interface UnionOption {
  value: string;
  label: string;
  fields: UnionOptionField[];
  schema: z.ZodObject<z.ZodRawShape>;
}

type FormFieldsetWidgetMeta = BaseMetadata & {
  widget: WidgetType.FormFieldset;
};

export type DiscriminatedUnionWidgetProps = Omit<
  BaseWidgetProps<Record<string, unknown>, FormFieldsetWidgetMeta>,
  'schema'
> & {
  schema: z.ZodDiscriminatedUnion;
  unionOptions: { discriminatorKey: string; options: UnionOption[] };
};

export const getDiscriminatorKey = (
  schema: z.ZodDiscriminatedUnion<z.ZodObject<z.ZodRawShape>[]>
): string => {
  return (schema as unknown as { _def: { discriminator: string } })._def.discriminator;
};

export const getDiscriminatorFieldValue = (
  optionSchema: z.ZodObject<z.ZodRawShape>,
  discriminatorKey: string
) => {
  return (optionSchema.shape[discriminatorKey] as z.ZodLiteral<string>).value;
};

export const getUnionOptions = (
  schema: z.ZodTypeAny
): { discriminatorKey: string; options: UnionOption[] } | undefined => {
  const discriminatedSchema = schema as z.ZodDiscriminatedUnion<z.ZodObject<z.ZodRawShape>[]>;
  const discriminatorKey = getDiscriminatorKey(discriminatedSchema);

  const options: UnionOption[] = discriminatedSchema.options.map(
    (optionSchema: z.ZodObject<z.ZodRawShape>) => {
      const discriminatorValue = getDiscriminatorFieldValue(optionSchema, discriminatorKey);
      const optionMeta = getMeta(optionSchema);

      // Extract all fields except the discriminator
      const fields: UnionOptionField[] = Object.entries(optionSchema.shape)
        .filter(([fieldKey]) => fieldKey !== discriminatorKey)
        .map(([fieldKey, fieldSchema]) => ({
          id: fieldKey,
          schema: fieldSchema as z.ZodTypeAny,
          meta: getMeta(fieldSchema as z.ZodTypeAny),
        }));

      return {
        value: discriminatorValue,
        label: (optionMeta?.label as string | undefined) || discriminatorValue,
        fields,
        schema: optionSchema,
      };
    }
  );

  return { discriminatorKey, options };
};

/**
 * Normalizes default value for discriminated unions.
 * If the default value is a string (discriminator), converts it to a full object.
 */
export const normalizeDiscriminatedUnionDefault = (
  schema: z.ZodTypeAny,
  defaultValue: unknown
): unknown | undefined => {
  const unionOptions = getUnionOptions(schema);
  if (unionOptions) {
    if (unionOptions.options.length === 1) {
      return getDefaultValuesFromSchema(
        unionOptions.options[0].schema,
        unionOptions.discriminatorKey
      );
    }

    const matchingOption = unionOptions.options.find((opt) => opt.value === defaultValue);
    if (matchingOption) {
      return getDefaultValuesFromSchema(matchingOption.schema, unionOptions.discriminatorKey);
    }
  }

  return undefined;
};

export const DiscriminatedUnionField: React.FC<DiscriminatedUnionWidgetProps> = (props) => {
  const { schema } = props;

  const unionOptions = schema ? getUnionOptions(schema) : undefined;

  if (!unionOptions) {
    throw new Error('DiscriminatedUnionField requires a discriminated union schema');
  }

  const { options } = unionOptions;
  const isSingleOption = options.length === 1;

  return isSingleOption ? (
    <SingleOptionUnionField {...props} unionOptions={unionOptions} />
  ) : (
    <MultiOptionUnionField {...props} unionOptions={unionOptions} />
  );
};
