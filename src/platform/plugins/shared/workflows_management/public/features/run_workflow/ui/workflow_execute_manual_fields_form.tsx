/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiComboBox,
  EuiDatePicker,
  EuiFieldNumber,
  EuiFieldText,
  EuiFormRow,
  EuiSelect,
  EuiSpacer,
  EuiSwitch,
  EuiTextArea,
  type EuiComboBoxOptionOption,
} from '@elastic/eui';
import moment from 'moment';
import React, { useCallback, useMemo } from 'react';
import type { JsonModelSchemaType } from '@kbn/workflows/spec/schema/common/json_model_schema';
import type { JsonSchema } from '@kbn/workflows/spec/schema/common/json_model_shape_schema';

export interface WorkflowExecuteManualFieldsFormProps {
  readonly inputs: JsonModelSchemaType;
  readonly value: Record<string, unknown>;
  readonly onChange: (next: Record<string, unknown>) => void;
  readonly fieldErrors: ReadonlyMap<string, string>;
}

const readType = (schema: JsonSchema): string => {
  if (schema.format === 'date' || schema.format === 'date-time') return 'date';
  if (schema.type === 'number' || schema.type === 'integer') return 'number';
  if (schema.type === 'boolean') return 'boolean';
  if (schema.type === 'object') return 'object';
  if (schema.type === 'array') return 'array';
  return 'string';
};

/**
 * EUI control-per-input run form generated from a Manual trigger's JSON Schema.
 * Object/array inputs use a JSON textarea for now.
 * // TODO: upgrade object/array to a structured editor later.
 */
export function WorkflowExecuteManualFieldsForm({
  inputs,
  value,
  onChange,
  fieldErrors,
}: WorkflowExecuteManualFieldsFormProps) {
  const required = useMemo(() => new Set(inputs.required ?? []), [inputs.required]);
  const entries = useMemo(
    () => Object.entries(inputs.properties ?? {}) as Array<[string, JsonSchema]>,
    [inputs.properties]
  );

  const setField = useCallback(
    (name: string, next: unknown) => {
      onChange({ ...value, [name]: next });
    },
    [onChange, value]
  );

  return (
    <div data-test-subj="workflowExecuteManualFieldsForm">
      {entries.map(([name, schema], index) => {
        const type = readType(schema);
        const isRequired = required.has(name);
        const error = fieldErrors.get(name);
        const helpText = typeof schema.description === 'string' ? schema.description : undefined;
        const enumValues = Array.isArray(schema.enum)
          ? schema.enum.map((v) => String(v))
          : undefined;
        const examplesRaw = (schema as { examples?: unknown }).examples;
        const examples = Array.isArray(examplesRaw)
          ? examplesRaw.map((v) => String(v))
          : undefined;
        const fieldValue = value[name];
        const label = isRequired ? `${name} *` : name;

        let control: React.ReactNode;
        if (type === 'boolean') {
          control = (
            <EuiSwitch
              label={label}
              checked={Boolean(fieldValue)}
              onChange={(e) => setField(name, e.target.checked)}
              data-test-subj={`workflowExecuteManualField-${name}`}
            />
          );
        } else if (type === 'number') {
          control = (
            <EuiFieldNumber
              compressed
              fullWidth
              value={typeof fieldValue === 'number' ? fieldValue : ''}
              onChange={(e) => {
                const n = e.target.value === '' ? undefined : Number(e.target.value);
                setField(name, n);
              }}
              data-test-subj={`workflowExecuteManualField-${name}`}
            />
          );
        } else if (type === 'date') {
          const m = typeof fieldValue === 'string' && fieldValue ? moment(fieldValue) : null;
          control = (
            <EuiDatePicker
              selected={m && m.isValid() ? m : undefined}
              onChange={(date) => setField(name, date ? date.format('YYYY-MM-DD') : undefined)}
              data-test-subj={`workflowExecuteManualField-${name}`}
            />
          );
        } else if (enumValues && enumValues.length > 0) {
          control = (
            <EuiSelect
              compressed
              fullWidth
              hasNoInitialSelection={!isRequired && fieldValue == null}
              options={enumValues.map((v) => ({ value: v, text: v }))}
              value={fieldValue == null ? '' : String(fieldValue)}
              onChange={(e) => setField(name, e.target.value)}
              data-test-subj={`workflowExecuteManualField-${name}`}
            />
          );
        } else if (examples && examples.length > 0) {
          const selected: EuiComboBoxOptionOption[] =
            fieldValue == null || fieldValue === '' ? [] : [{ label: String(fieldValue) }];
          const options = examples.map((v) => ({ label: v }));
          control = (
            <EuiComboBox
              compressed
              fullWidth
              singleSelection={{ asPlainText: true }}
              options={options}
              selectedOptions={selected}
              onChange={(selectedOptions) =>
                setField(name, selectedOptions[0]?.label ?? undefined)
              }
              onCreateOption={(created) => setField(name, created)}
              data-test-subj={`workflowExecuteManualField-${name}`}
            />
          );
        } else if (type === 'object' || type === 'array') {
          // TODO: upgrade object/array to a structured editor later.
          control = (
            <EuiTextArea
              compressed
              fullWidth
              rows={4}
              value={
                fieldValue === undefined
                  ? ''
                  : typeof fieldValue === 'string'
                    ? fieldValue
                    : JSON.stringify(fieldValue, null, 2)
              }
              onChange={(e) => {
                const raw = e.target.value;
                try {
                  setField(name, raw.trim() ? JSON.parse(raw) : undefined);
                } catch {
                  setField(name, raw);
                }
              }}
              data-test-subj={`workflowExecuteManualField-${name}`}
            />
          );
        } else {
          control = (
            <EuiFieldText
              compressed
              fullWidth
              value={fieldValue == null ? '' : String(fieldValue)}
              onChange={(e) => setField(name, e.target.value)}
              data-test-subj={`workflowExecuteManualField-${name}`}
            />
          );
        }

        return (
          <React.Fragment key={name}>
            {index > 0 ? <EuiSpacer size="s" /> : null}
            <EuiFormRow
              label={type === 'boolean' ? undefined : label}
              helpText={helpText}
              isInvalid={Boolean(error)}
              error={error}
              fullWidth
            >
              {control}
            </EuiFormRow>
          </React.Fragment>
        );
      })}
    </div>
  );
}
