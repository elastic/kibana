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
import { ZodError } from '@kbn/zod/v4';
import { getMeta } from '@kbn/connector-specs/src/connector_spec_ui';
import type { ValidationFunc } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { ERROR_CODE } from '@kbn/es-ui-shared-plugin/static/forms/helpers/field_validators/types';
import { EuiSpacer } from '@elastic/eui';
import { getWidgetComponent } from './widgets/registry';
import { unwrap } from './schema_unwrap';

export interface FieldDefinition {
  path: string;
  validate: (...args: Parameters<ValidationFunc>) => ReturnType<ValidationFunc<any, ERROR_CODE>>;
  schema: z.ZodType;
  options?: Record<string, unknown>;
}

export const getFieldFromSchema = ({ schema, path }: { schema: z.ZodType; path: string }) => {
  return {
    path,
    schema,
    validate: (
      ...args: Parameters<ValidationFunc>
    ): ReturnType<ValidationFunc<any, ERROR_CODE>> => {
      const [{ value, path: formPath }] = args;

      try {
        schema.parse(value);
        return undefined;
      } catch (error) {
        if (!(error instanceof ZodError)) {
          throw new Error(`Unexpected validation error: ${error}`);
        }

        const errors = error.issues.map((issue) => {
          return issue.message;
        });

        if (errors.length > 0) {
          return { code: 'ERR_FIELD_MISSING', path: formPath, message: errors.join(', ') };
        }
      }
    },
  };
};

export const getFieldsFromSchema = <T extends z.ZodRawShape>({
  schema,
  rootPath,
}: {
  schema: z.ZodObject<T>;
  rootPath?: string;
}) => {
  const fields: FieldDefinition[] = [];

  Object.keys(schema.shape).forEach((key) => {
    const fieldSchema = schema.shape[key] as z.ZodType;
    const path = rootPath ? `${rootPath}.${key}` : key;
    const field = getFieldFromSchema({ schema: fieldSchema, path });
    fields.push(field);
  });

  return fields;
};

export const renderFieldComponent = ({ field }: { field: FieldDefinition }) => {
  const { schema: outerSchema, validate, path } = field;

  // Some schemas are wrapped (e.g., with ZodOptional or ZodDefault), so we unwrap them to get the underlying schema
  const { schema, defaultValue } = unwrap(outerSchema);
  const meta = getMeta(schema);
  const WidgetComponent = getWidgetComponent(schema);

  return (
    <React.Fragment key={path}>
      <WidgetComponent
        key={path}
        path={path}
        schema={schema}
        fieldConfig={{
          defaultValue: defaultValue ?? meta.default,
          validations: [
            {
              validator: validate,
            },
          ],
        }}
        fieldProps={{
          label: meta.label,
          helpText: meta.helpText,
          fullWidth: true,
          euiFieldProps: {
            placeholder: meta.placeholder,
            ['data-test-subj']: `generator-field-${path.replace(/\./g, '-')}`,
          },
        }}
      />
      <EuiSpacer size="m" />
    </React.Fragment>
  );
};

interface FormProps<TSchema extends z.ZodObject<z.ZodRawShape>> {
  schema: TSchema;
}
export const FormGenerator = <TSchema extends z.ZodObject<z.ZodRawShape>>({
  schema,
}: FormProps<TSchema>) => {
  const fields = getFieldsFromSchema({ schema });
  return fields.map((field) => renderFieldComponent({ field }));
};
