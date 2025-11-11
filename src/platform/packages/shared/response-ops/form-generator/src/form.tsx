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
import { useFormState } from './use_form_state';
import type { UIMetadata } from './connector_spec_ui';
import { getUIMeta } from './connector_spec_ui';
import { getDiscriminatedUnionInitialValue, getWidget } from './widgets';

type WidgetType = NonNullable<UIMetadata['widget']>;

export interface FieldDefinition {
  id: string;
  staticProps: {
    fullWidth?: boolean;
    placeholder?: string;
    label?: string;
    default?: unknown;
  };
  initialValue?: unknown;
  value?: unknown;
  validate: (value: unknown) => string[] | string | undefined;
  schema?: z.ZodTypeAny;
  widget?: WidgetType;
}

const getStaticProps = ({ schema }: { schema: z.ZodTypeAny }) => {
  const uiMeta = getUIMeta(schema) || {};
  const { placeholder, label, widgetOptions } = uiMeta;

  const commonProps = {
    fullWidth: true,
    label,
    placeholder,
    default: widgetOptions?.default,
  };

  const mergedOptions = {
    ...commonProps,
    ...widgetOptions,
  };

  return mergedOptions;
};

const getFieldsFromSchema = (schema: z.ZodObject<any>) => {
  const fields: FieldDefinition[] = [];

  Object.entries(schema.shape).forEach(([key, subSchema]) => {
    const schemaAny = subSchema as z.ZodObject<any>;

    const uiMeta = getUIMeta(schemaAny);
    if (!uiMeta || !uiMeta.widget) {
      throw new Error(`UI metadata is missing for field: ${key}`);
    }

    const staticProps = getStaticProps({ schema: schemaAny });

    let initialValue = staticProps.default;

    if (uiMeta.widget === 'formFieldset' && schemaAny instanceof z.ZodDiscriminatedUnion) {
      initialValue = getDiscriminatedUnionInitialValue(schemaAny);
    }

    fields.push({
      id: key,
      staticProps,
      initialValue,
      schema: schemaAny,
      widget: uiMeta.widget,
      validate: (value: unknown) => {
        try {
          schemaAny.parse(value);
          return undefined;
        } catch (error) {
          if (error instanceof z.ZodError) {
            return error.issues.map((issue) => issue.message);
          }
          return 'Invalid value';
        }
      },
    });
  });

  return fields;
};

interface FormProps {
  connectorSchema: z.ZodObject<any>;
  onSubmit?: ({ data }: { data: Record<string, unknown> }) => void;
}
export const Form = ({ connectorSchema, onSubmit }: FormProps) => {
  const fields = useMemo(() => getFieldsFromSchema(connectorSchema), [connectorSchema]);
  const form = useFormState(fields);

  const _onSubmit = ({ data }: { data: Record<string, unknown> }) => {
    onSubmit?.({ data });
    form.reset();
  };

  return (
    <EuiForm component="form" onSubmit={form.handleSubmit(_onSubmit)}>
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
