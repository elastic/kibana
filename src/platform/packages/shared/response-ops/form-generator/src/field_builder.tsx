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
import type { ValidationFunc } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { i18n } from '@kbn/i18n';
import { EuiText } from '@elastic/eui';
import type { FormConfig, ResolvedMetaFunctions } from './form';
import { getWidgetComponent } from './widgets';
import { extractSchemaCore } from './schema_extract_core';
import {
  addMeta as defaultAddMeta,
  getMeta as defaultGetMeta,
} from './schema_connector_metadata';

const OPTIONAL_LABEL = i18n.translate('responseOps.formGenerator.fieldBuilder.optionalLabel', {
  defaultMessage: 'Optional',
});

export type FieldValidationFunc = (
  ...args: Parameters<ValidationFunc>
) => ReturnType<ValidationFunc<any>>;

export interface FieldDefinition {
  /* The dot-notated path to the field within the form data */
  path: string;
  /* Validation function for the field */
  validate: FieldValidationFunc;
  /* The Zod schema for the field */
  schema: z.ZodType;
  /* Global form configuration */
  formConfig: FormConfig;
  /* Options for fields like select dropdowns */
  options?: Record<string, unknown>;
  defaultValue?: unknown;
  isOptional?: boolean;
}

interface GetFieldFromSchemaProps {
  schema: z.ZodType;
  path: string;
  formConfig: FormConfig;
}
export const getFieldFromSchema = ({
  schema: outerSchema,
  path,
  formConfig,
}: GetFieldFromSchemaProps) => {
  const { schema, defaultValue, isOptional } = extractSchemaCore(outerSchema);

  return {
    path,
    schema,
    formConfig,
    defaultValue,
    isOptional,
    validate: (...args: Parameters<ValidationFunc>): ReturnType<ValidationFunc> => {
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
          return { path: formPath, message: errors.join(', ') };
        }

        return undefined;
      }
    },
  };
};

export const getFieldsFromSchema = <T extends z.ZodRawShape>({
  schema,
  rootPath,
  formConfig,
  meta = { getMeta: defaultGetMeta, addMeta: defaultAddMeta },
}: {
  schema: z.ZodObject<T>;
  rootPath?: string;
  formConfig: FormConfig;
  meta?: ResolvedMetaFunctions;
}) => {
  const { getMeta, addMeta } = meta;
  const fields: FieldDefinition[] = [];
  const isFormOrParentDisabled = formConfig.disabled || getMeta(schema).disabled;

  Object.keys(schema.shape).forEach((key) => {
    const fieldSchema = schema.shape[key] as z.ZodType;
    const fieldMeta = getMeta(fieldSchema);
    const path = rootPath ? `${rootPath}.${key}` : key;

    if (isFormOrParentDisabled && fieldMeta.disabled !== false) {
      addMeta(fieldSchema, { disabled: true });
    }

    const field = getFieldFromSchema({
      schema: fieldSchema,
      path,
      formConfig,
    });

    fields.push(field);
  });

  return fields;
};

interface RenderFieldProps {
  field: FieldDefinition;
  meta?: ResolvedMetaFunctions;
}
export const renderField = ({
  field,
  meta = { getMeta: defaultGetMeta, addMeta: defaultAddMeta },
}: RenderFieldProps) => {
  const { getMeta, addMeta } = meta;
  const { schema, validate, path, formConfig, defaultValue, isOptional } = field;

  const WidgetComponent = getWidgetComponent(schema, { getMeta, addMeta });
  const { label, helpText, disabled, placeholder } = getMeta(schema);

  return (
    <React.Fragment key={path}>
      <WidgetComponent
        key={path}
        path={path}
        schema={schema}
        formConfig={formConfig}
        meta={meta}
        fieldConfig={{
          label,
          defaultValue,
          validations: [
            {
              validator: validate,
            },
          ],
        }}
        fieldProps={{
          helpText,
          fullWidth: true,
          labelAppend: isOptional ? (
            <EuiText size="xs" color="subdued">
              {OPTIONAL_LABEL}
            </EuiText>
          ) : null,
          euiFieldProps: {
            disabled: formConfig.disabled || disabled,
            placeholder,
            ['data-test-subj']: `generator-field-${path.replace(/\./g, '-')}`,
          },
        }}
      />
    </React.Fragment>
  );
};
