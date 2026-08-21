/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiFieldNumber,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiSelect,
  EuiSwitch,
  EuiTextArea,
} from '@elastic/eui';
import React from 'react';
import type { InstallFormField } from '@kbn/workflows-library';
import { ConnectorField } from './connector_field';

export interface InstallFormProps {
  fields: InstallFormField[];
  /** Current form values, keyed by field name. Owned by the parent. */
  values: Record<string, unknown>;
  /** Display-ready validation message per field name (the parent decides visibility). */
  errors: Record<string, string | undefined>;
  /** Fired on every input change (keystroke included for text inputs). */
  onChange: (name: string, value: unknown) => void;
  /**
   * Fired when a value is ready to be reflected elsewhere (touched tracking,
   * the live YAML preview): on change for discrete inputs (select, switch,
   * connector, number), on blur for free-text inputs.
   */
  onCommit: (name: string, value: unknown) => void;
}

/**
 * Renders a template's `install.form` fields. Purely presentational — the
 * parent owns values, validation, and touched state (so a future composition
 * flow can render several instances against one state).
 */
export const InstallForm = React.memo<InstallFormProps>(function InstallForm({
  fields,
  values,
  errors,
  onChange,
  onCommit,
}) {
  return (
    <EuiForm component="div" fullWidth data-test-subj="workflowLibraryInstallForm">
      {fields.map((field) => {
        const error = errors[field.name];
        return (
          <EuiFormRow
            key={field.name}
            label={field.label ?? field.name}
            helpText={field.description}
            isInvalid={Boolean(error)}
            error={error}
            fullWidth
            data-test-subj={`workflowLibraryInstallForm-row-${field.name}`}
          >
            <InstallFormFieldControl
              field={field}
              value={values[field.name]}
              isInvalid={Boolean(error)}
              onChange={onChange}
              onCommit={onCommit}
            />
          </EuiFormRow>
        );
      })}
    </EuiForm>
  );
});
InstallForm.displayName = 'InstallForm';

interface InstallFormFieldControlProps {
  field: InstallFormField;
  value: unknown;
  isInvalid: boolean;
  onChange: (name: string, value: unknown) => void;
  onCommit: (name: string, value: unknown) => void;
}

const InstallFormFieldControl = React.memo<InstallFormFieldControlProps>(
  function InstallFormFieldControl({ field, value, isInvalid, onChange, onCommit }) {
    const { name } = field;
    const testSubj = `workflowLibraryInstallForm-field-${name}`;
    // Free-text inputs update the value on every keystroke but only commit
    // (touch + preview refresh) on blur; discrete inputs commit immediately.
    const changeAndCommit = (newValue: unknown) => {
      onChange(name, newValue);
      onCommit(name, newValue);
    };

    switch (field.inputType) {
      case 'textarea':
        return (
          <EuiTextArea
            value={asString(value)}
            onChange={(e) => onChange(name, e.target.value)}
            onBlur={(e) => onCommit(name, e.target.value)}
            isInvalid={isInvalid}
            fullWidth
            compressed
            rows={3}
            data-test-subj={testSubj}
          />
        );
      case 'number':
        return (
          <EuiFieldNumber
            value={typeof value === 'number' ? value : ''}
            onChange={(e) =>
              changeAndCommit(e.target.value === '' ? undefined : Number(e.target.value))
            }
            isInvalid={isInvalid}
            fullWidth
            compressed
            data-test-subj={testSubj}
          />
        );
      case 'boolean':
        return (
          <EuiSwitch
            label={field.label ?? name}
            showLabel={false}
            checked={Boolean(value)}
            onChange={(e) => changeAndCommit(e.target.checked)}
            compressed
            data-test-subj={testSubj}
          />
        );
      case 'select':
        return (
          <EuiSelect
            options={field.options.map((option) => ({
              value: option.value,
              text: option.label,
            }))}
            value={asString(value) || undefined}
            hasNoInitialSelection={value === undefined || value === ''}
            onChange={(e) => changeAndCommit(e.target.value)}
            isInvalid={isInvalid}
            fullWidth
            compressed
            data-test-subj={testSubj}
            aria-label={field.label ?? name}
          />
        );
      case 'connector':
        return (
          <ConnectorField
            connectorType={field.connectorType}
            value={asString(value) || undefined}
            onChange={(connectorId) => changeAndCommit(connectorId)}
            isInvalid={isInvalid}
            data-test-subj={testSubj}
          />
        );
      case 'text':
      case 'esIndex':
      default:
        return (
          <EuiFieldText
            value={asString(value)}
            onChange={(e) => onChange(name, e.target.value)}
            onBlur={(e) => onCommit(name, e.target.value)}
            isInvalid={isInvalid}
            fullWidth
            compressed
            data-test-subj={testSubj}
          />
        );
    }
  }
);

const asString = (value: unknown): string =>
  typeof value === 'string' || typeof value === 'number' ? String(value) : '';
