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
import type {
  EuiDatePickerProps,
  EuiFieldNumberProps,
  EuiFieldPasswordProps,
  EuiFieldTextProps,
  EuiSelectProps,
  EuiSuperSelectProps,
  EuiSwitchProps,
  EuiTextAreaProps,
} from '@elastic/eui';
import { EuiButton, EuiFieldText, EuiForm, EuiFormRow, EuiSelect } from '@elastic/eui';
import { useFormState } from './use_form_state';
import type { UIMetadata } from './connector_spec_ui';
import { getUIMeta } from './connector_spec_ui';

interface WidgetPropsMap {
  text: EuiFieldTextProps;
  password: EuiFieldPasswordProps;
  json: EuiTextAreaProps;
  code: EuiTextAreaProps;
  keyValue: Record<string, unknown>;
  number: EuiFieldNumberProps;
  select: EuiSelectProps;
  textarea: EuiTextAreaProps;
  multiSelect: EuiSuperSelectProps<string>;
  toggle: EuiSwitchProps;
  date: EuiDatePickerProps;
  dateTime: EuiDatePickerProps;
  fileUpload: any;
}

type WidgetType = NonNullable<UIMetadata['widget']>;
type AnyWidgetProps = WidgetPropsMap[WidgetType];

export interface FieldDefinition {
  id: string;
  render: React.ComponentType<AnyWidgetProps>;
  staticProps: {
    fullWidth?: boolean;
    placeholder?: string;
    label?: string;
    default?: unknown;
  };
  initialValue?: unknown;
  value?: unknown;
  validate: (value: unknown) => string[] | string | undefined;
}

const widgetComponents: Partial<{
  [K in WidgetType]: {
    Component: React.ComponentType<WidgetPropsMap[K]>;
    enhanceProps?: (schema: z.ZodTypeAny, props: WidgetPropsMap[K]) => WidgetPropsMap[K];
  };
}> = {
  text: {
    Component: EuiFieldText,
  },
  select: {
    Component: EuiSelect,
    enhanceProps: (schema, props) => {
      if (schema instanceof z.ZodEnum) {
        const mappedOptions = schema.options.map((option) => ({
          value: option.valueOf(),
          text: option.valueOf(),
        }));
        return { ...props, options: mappedOptions };
      }
      return props;
    },
  },
};
const getRenderFn = ({ schema }: { schema: z.ZodTypeAny }): React.ComponentType<AnyWidgetProps> => {
  const metadata = getUIMeta(schema);
  const widget = metadata?.widget;

  if (!widget || !(widget in widgetComponents) || !widgetComponents[widget]) {
    throw new Error(`Unsupported widget type: ${widget}`);
  }

  const widgetConfig = widgetComponents[widget]!;
  const { Component, enhanceProps } = widgetConfig;

  return (props) => {
    const finalProps = enhanceProps ? enhanceProps(schema, props) : props;

    return <Component {...(finalProps as any)} />;
  };
};
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

    const renderFn = getRenderFn({ schema: schemaAny });
    const staticProps = getStaticProps({ schema: schemaAny });

    fields.push({
      id: key,
      render: renderFn,
      staticProps,
      initialValue: staticProps.default,
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
        const { render: RenderComponent, id, staticProps } = field;
        return (
          <EuiFormRow
            key={id}
            label={staticProps.label}
            error={form.errors[id]}
            isInvalid={!!form.errors[id]}
          >
            <RenderComponent
              {...staticProps}
              value={form.values[id]}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                form.handleChange(id, e.target.value)
              }
              onBlur={() => form.handleBlur(id)}
              isInvalid={!!form.errors[id]}
            />
          </EuiFormRow>
        );
      })}
      <EuiButton type="submit" fill>
        Submit
      </EuiButton>
    </EuiForm>
  );
};
