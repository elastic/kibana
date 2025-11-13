/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { z } from '@kbn/zod/v4';
import { EuiButton, EuiForm, EuiSpacer } from '@elastic/eui';
import { getMeta } from './get_metadata';
import { useFormState } from './use_form_state';
import type { WidgetType } from './widgets';
import { getDiscriminatedUnionInitialValue, getWidget } from './widgets';

export interface FieldDefinition {
  id: string;
  staticProps: {
    fullWidth?: boolean;
    placeholder?: string;
    label?: string;
    default?: unknown;
    helpText?: string;
  };
  initialValue?: unknown;
  value?: unknown;
  validate: (value: unknown) => Record<string, string | string[]> | undefined;
  schema?: z.ZodTypeAny;
  widget?: WidgetType;
}

const getStaticProps = ({ schema }: { schema: z.ZodTypeAny }) => {
  const metaInfo = getMeta(schema) || {};
  const { widgetOptions } = metaInfo;

  const commonProps = {
    fullWidth: true,
    label: widgetOptions?.label as string | undefined,
    placeholder: widgetOptions?.placeholder as string | undefined,
    default: widgetOptions?.default,
    helpText: widgetOptions?.helpText as string | undefined,
  };

  const mergedOptions = {
    ...commonProps,
    ...widgetOptions,
  };

  return mergedOptions;
};

const getFieldsFromSchema = <T extends z.ZodRawShape>(schema: z.ZodObject<T>) => {
  const fields: FieldDefinition[] = [];

  Object.entries(schema.shape).forEach(([key, subSchema]) => {
    const schemaAny = subSchema as z.ZodTypeAny;

    const metaInfo = getMeta(schemaAny);
    if (!metaInfo || !metaInfo.widget) {
      throw new Error(`UI metadata is missing for field: ${key}`);
    }

    const staticProps = getStaticProps({ schema: schemaAny });

    let initialValue = staticProps.default;

    if (metaInfo.widget === 'formFieldset' && schemaAny instanceof z.ZodDiscriminatedUnion) {
      initialValue = getDiscriminatedUnionInitialValue(
        schemaAny as z.ZodDiscriminatedUnion<z.ZodObject<z.ZodRawShape>[]>
      );
    } else if (metaInfo.widget === 'keyValue' && !initialValue) {
      initialValue = {};
    }

    fields.push({
      id: key,
      staticProps,
      initialValue,
      schema: schemaAny,
      widget: metaInfo.widget,
      validate: (value: unknown) => {
        try {
          schemaAny.parse(value);
          return undefined;
        } catch (error) {
          if (error instanceof z.ZodError) {
            const errors: Record<string, string | string[]> = {};

            error.issues.forEach((issue) => {
              const path = issue.path.join('.');
              const existingError = errors[path];

              if (existingError) {
                errors[path] = Array.isArray(existingError)
                  ? [...existingError, issue.message]
                  : [existingError, issue.message];
              } else {
                errors[path] = issue.message;
              }
            });

            return Object.keys(errors).length > 0 ? errors : undefined;
          }
          return { '': 'Invalid value' };
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
        const { id, staticProps, widget, schema: fieldSchema } = field;

        if (!widget) {
          throw new Error(`Widget type is required for field: ${id}`);
        }

        const WidgetComponent = getWidget(widget);

        if (!WidgetComponent) {
          throw new Error(`Unsupported widget type: ${widget}`);
        }

        return (
          <WidgetComponent
            key={id}
            fieldId={id}
            value={form.values[id]}
            label={staticProps.label}
            placeholder={staticProps.placeholder}
            fullWidth={staticProps.fullWidth}
            error={form.errors[id]}
            isInvalid={!!form.errors[id]}
            onChange={form.handleChange}
            onBlur={form.handleBlur}
            schema={fieldSchema}
            widgetOptions={staticProps}
            setFieldError={form.setFieldError}
            setFieldTouched={form.setFieldTouched}
            getFieldValue={form.getFieldValue}
            validateField={(fieldId: string, value: unknown) =>
              form.validateField(fieldId, value, fields)
            }
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
