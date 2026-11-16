/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiComboBox, EuiFieldNumber, EuiFieldText, EuiSelect, EuiSwitch } from '@elastic/eui';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import React from 'react';
import type { WorkflowInputDescriptor } from '../lib/describe_workflow_inputs';

export interface WorkflowInputFieldProps {
  descriptor: WorkflowInputDescriptor;
  value: unknown;
  onChange: (value: unknown) => void;
  id: string;
}

const toText = (value: unknown): string =>
  value === undefined || value === null ? '' : String(value);

const toOptions = (values: unknown): Array<EuiComboBoxOptionOption<string>> =>
  Array.isArray(values) ? values.map((value) => ({ label: String(value) })) : [];

const isNumericItem = (descriptor: WorkflowInputDescriptor): boolean =>
  descriptor.itemKind === 'number' || descriptor.itemKind === 'integer';

/** A constant value for a workflow input, edited with the control that suits the input's kind. */
export const WorkflowInputField = ({
  descriptor,
  value,
  onChange,
  id,
}: WorkflowInputFieldProps): React.JSX.Element => {
  switch (descriptor.kind) {
    case 'boolean':
      return (
        <EuiSwitch
          id={id}
          label={descriptor.label}
          checked={value === true}
          onChange={(event) => onChange(event.target.checked)}
        />
      );
    case 'number':
    case 'integer':
      return (
        <EuiFieldNumber
          id={id}
          fullWidth
          step={descriptor.kind === 'integer' ? 1 : 'any'}
          value={typeof value === 'number' ? value : ''}
          onChange={(event) =>
            onChange(event.target.value === '' ? undefined : Number(event.target.value))
          }
        />
      );
    case 'enum':
      return (
        <EuiSelect
          id={id}
          aria-label={descriptor.label}
          fullWidth
          hasNoInitialSelection={value === undefined}
          options={(descriptor.enumValues ?? []).map((option) => ({
            value: String(option),
            text: String(option),
          }))}
          value={toText(value)}
          onChange={(event) =>
            onChange(descriptor.enumValues?.find((option) => String(option) === event.target.value))
          }
        />
      );
    case 'array':
      return (
        <EuiComboBox
          id={id}
          aria-label={descriptor.label}
          fullWidth
          noSuggestions={!descriptor.itemEnumValues}
          options={(descriptor.itemEnumValues ?? []).map((option) => ({ label: String(option) }))}
          selectedOptions={toOptions(value)}
          onCreateOption={
            descriptor.itemEnumValues
              ? undefined
              : (created) =>
                  onChange([
                    ...(Array.isArray(value) ? value : []),
                    isNumericItem(descriptor) ? Number(created) : created,
                  ])
          }
          onChange={(selected) =>
            onChange(
              selected.map(({ label }) => (isNumericItem(descriptor) ? Number(label) : label))
            )
          }
        />
      );
    default:
      return (
        <EuiFieldText
          id={id}
          fullWidth
          placeholder={descriptor.kind === 'date' ? '2026-01-31T00:00:00.000Z' : undefined}
          value={toText(value)}
          onChange={(event) => onChange(event.target.value === '' ? undefined : event.target.value)}
        />
      );
  }
};
