/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import { ControlValuesSource, DEFAULT_DATA_CONTROL_STATE } from '@kbn/controls-constants';

export const controlTitleSchema = z
  .object({
    title: z.string().optional().meta({ description: 'A human-readable title for the control.' }),
  })
  .strict();

const sharedDataControlProps = {
  ...controlTitleSchema.shape,
  use_global_filters: z.boolean().default(DEFAULT_DATA_CONTROL_STATE.use_global_filters).meta({
    description:
      "When `true`, the control's available options are narrowed by the page's active filters.",
  }),
  ignore_validations: z.boolean().default(DEFAULT_DATA_CONTROL_STATE.ignore_validations).meta({
    description:
      'When `true`, the control skips selection validation and does not report which selections are responsible for returning zero results.',
  }),
};

/**
 * This uses a union with only one option so we can provide a default value for backwards compat
 */
export const dataControlFieldValuesSourceSchema = z
  .union([z.literal(ControlValuesSource.FIELD)])
  .default(ControlValuesSource.FIELD)
  .meta({
    description:
      'The source of the field options for this control. Defaults to `field` for legacy controls.',
  });

/**
 * Injects a default `values_source: 'field'` when the field is absent from the input.
 * Config-schema's discriminatedUnion applied field defaults before discriminating; Zod does not.
 * This preprocess step restores backward compatibility for legacy state without values_source.
 *
 * Ideally this logic is corrected in the future and removed.
 */
export const withFieldValuesSourceDefault = (val: unknown): unknown => {
  if (typeof val === 'object' && val !== null && !Array.isArray(val) && !('values_source' in val)) {
    return { values_source: ControlValuesSource.FIELD, ...val };
  }
  return val;
};

export const dataControlFieldVariantSchema = z
  .object({
    ...sharedDataControlProps,
    values_source: dataControlFieldValuesSourceSchema,
    data_view_id: z.string().min(1).meta({
      description: 'The ID of the data view that provides field options for this control.', // this will generate a reference
    }),
    field_name: z.string().min(1).meta({
      description: 'The name of the field in the data view that this control filters on.',
    }),
  })
  .strip();

export const dataControlEsqlVariantSchema = z
  .object({
    ...sharedDataControlProps,
    values_source: z.literal(ControlValuesSource.ESQL),
    esql_query: z.string().min(1).meta({
      description: 'The ES|QL query that provides field options for this control',
    }),
  })
  .strip();

export const dataControlSchema = z.preprocess(
  withFieldValuesSourceDefault,
  z
    .discriminatedUnion('values_source', [
      dataControlEsqlVariantSchema,
      dataControlFieldVariantSchema,
    ])
    .meta({
      description:
        'The source of the field options for this control, either `field` for all possible values of a field, or `esql` for the results of an ES|QL query.',
    })
);
