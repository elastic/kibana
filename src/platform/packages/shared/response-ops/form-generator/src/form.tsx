/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import type { z } from '@kbn/zod/v4';
import { ZodError } from '@kbn/zod/v4';
import { EuiButton, EuiForm, EuiSpacer } from '@elastic/eui';
import { getMeta } from './schema_metadata';
import type { BaseMetadata } from './schema_metadata';
import { useFormState } from './use_form_state';
import type { WidgetType } from './widgets';
import { getWidgetComponent, getDefaultValueNormalizer } from './widgets/registry';

/**
 * Key used for root-level field validation errors.
 * When Zod validates a field value itself (not a nested property), issue.path is an empty array.
 * Example: z.string().email() fails → issue.path = [] → path.join('.') = ''
 * Nested errors use dot notation: ['user', 'email'] → 'user.email'
 */
export const ROOT_ERROR_KEY = '';

export interface FieldDefinition {
  id: string;
  initialValue?: unknown;
  value?: unknown;
  validate: (value: unknown) => Record<string, string | string[]> | undefined;
  schema: z.ZodTypeAny;
  widget?: WidgetType | string;
  meta: BaseMetadata;
}

const getFieldsFromSchema = <T extends z.ZodRawShape>(schema: z.ZodObject<T>) => {
  const fields: FieldDefinition[] = [];

  Object.entries(schema.shape).forEach(([key, subSchema]) => {
    const schemaAny = subSchema as z.ZodTypeAny;

    const metaInfo = getMeta(schemaAny);

    const normalizer = getDefaultValueNormalizer(schemaAny);
    const initialValue = normalizer
      ? normalizer(schemaAny, metaInfo.default) ?? metaInfo.default
      : metaInfo.default;

    fields.push({
      id: key,
      initialValue,
      schema: schemaAny,
      widget: metaInfo.widget,
      meta: metaInfo,
      validate: (value: unknown) => {
        try {
          schemaAny.parse(value);
          return undefined;
        } catch (error) {
          if (!(error instanceof ZodError)) {
            throw new Error(`Unexpected validation error: ${error}`);
          }

          const errors: Record<string, string | string[]> = {};

          error.issues.forEach((issue) => {
            const path = (issue.path[0] as string) || ROOT_ERROR_KEY;
            errors[path] = issue.message;
          });

          return Object.keys(errors).length > 0 ? errors : undefined;
        }
      },
    });
  });

  return fields;
};

interface FormProps<TSchema extends z.ZodObject<z.ZodRawShape>> {
  connectorSchema: TSchema;
  onSubmit?: ({ data }: { data: z.infer<TSchema> }) => void;
}
export const Form = <TSchema extends z.ZodObject<z.ZodRawShape>>({
  connectorSchema,
  onSubmit,
}: FormProps<TSchema>) => {
  const fields = useMemo(() => getFieldsFromSchema(connectorSchema), [connectorSchema]);
  const form = useFormState<z.infer<TSchema>>(fields);

  const _onSubmit = ({ data }: { data: z.infer<TSchema> }) => {
    onSubmit?.({ data });
    form.reset();
  };

  return (
    <EuiForm component="form" onSubmit={form.handleSubmit(_onSubmit)} noValidate>
      {fields.map((field) => {
        const { id, schema: fieldSchema, meta } = field;

        const WidgetComponent = getWidgetComponent(fieldSchema);

        const validateField = (fieldId: string, value: unknown) => {
          return form.validateField(fieldId, value, fields);
        };

        return (
          <WidgetComponent
            key={id}
            fieldId={id}
            value={form.values[id]}
            label={meta.label}
            placeholder={meta.placeholder}
            fullWidth={true}
            error={form.errors[id]}
            isInvalid={Boolean(form.errors[id])}
            onChange={form.handleChange}
            onBlur={form.handleBlur}
            schema={fieldSchema}
            meta={meta}
            setFieldError={form.setFieldError}
            setFieldTouched={form.setFieldTouched}
            getFieldValue={form.getFieldValue}
            validateField={validateField}
            errors={form.errors}
            touched={form.touched}
          />
        );
      })}
      <EuiSpacer size="m" />
      <EuiButton type="submit" fill>
        Submit
      </EuiButton>
    </EuiForm>
  );
};
