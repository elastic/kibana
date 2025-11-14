/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { z } from '@kbn/zod/v4';
import { getMeta, createWidgetTypeGuard, type BaseMetadata } from '../../schema_metadata';
import { SingleOptionUnionField } from './single_option_field';
import { MultiOptionUnionField } from './multi_option_field';
import type { BaseWidgetProps } from '../widget_props';
import { getDefaultValuesForOption } from './get_default_values';

export type FormFieldsetWidgetMeta = BaseMetadata & {
  widget: 'formFieldset';
};

export const isFormFieldsetWidgetMeta =
  createWidgetTypeGuard<FormFieldsetWidgetMeta>('formFieldset');

export type DiscriminatedUnionWidgetProps = Omit<
  BaseWidgetProps<Record<string, any>, FormFieldsetWidgetMeta>,
  'schema'
> & {
  schema?: z.ZodDiscriminatedUnion<any>;
};

export const getDiscriminatorFieldValue = (optionSchema: z.ZodObject<z.ZodRawShape>) => {
  return (optionSchema.shape.type as z.ZodLiteral<string>).value;
};

export const getDiscriminatedUnionInitialValue = (schema: z.ZodTypeAny, defaultValue?: unknown) => {
  if (!(schema instanceof z.ZodDiscriminatedUnion)) {
    throw new Error('Schema provided is not a ZodDiscriminatedUnion');
  }

  const discriminatedSchema = schema as z.ZodDiscriminatedUnion<z.ZodObject<z.ZodRawShape>[]>;
  const metaInfo = getMeta(discriminatedSchema);
  const metadataDefault = metaInfo?.default;
  const valueToUse = metadataDefault ?? defaultValue;

  if (valueToUse) {
    const matchingOption = discriminatedSchema.options.find(
      (option: z.ZodObject<z.ZodRawShape>) => {
        const discriminatorValue = getDiscriminatorFieldValue(option);
        return discriminatorValue === valueToUse;
      }
    );

    if (matchingOption) {
      return getDefaultValuesForOption(matchingOption);
    }
  }

  return getDefaultValuesForOption(discriminatedSchema.options[0]);
};

export const DiscriminatedUnionField: React.FC<DiscriminatedUnionWidgetProps> = (props) => {
  const { schema, value } = props;

  if (!(schema instanceof z.ZodDiscriminatedUnion)) {
    throw new Error('Schema provided to DiscriminatedUnionField is not a ZodDiscriminatedUnion');
  }

  const discriminatedSchema = schema as z.ZodDiscriminatedUnion<z.ZodObject<z.ZodRawShape>[]>;

  const currentValue =
    value && typeof value === 'object' && Object.keys(value).length > 0
      ? value
      : getDiscriminatedUnionInitialValue(discriminatedSchema);

  const isSingleOption = discriminatedSchema.options.length === 1;

  return isSingleOption ? (
    <SingleOptionUnionField {...props} value={currentValue} />
  ) : (
    <MultiOptionUnionField {...props} value={currentValue} />
  );
};
