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
  EuiFieldNumber,
  EuiFieldText,
  EuiSelect,
  EuiSwitch,
  EuiTextArea,
} from '@elastic/eui';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import React, { useState } from 'react';
import type { WorkflowInputDescriptor } from '../lib/describe_workflow_inputs';
import { CONFIRM_MESSAGES } from '../translations';

export interface WorkflowInputFieldProps {
  descriptor: WorkflowInputDescriptor;
  value: unknown;
  onChange: (value: unknown) => void;
  onJsonValidityChange?: (isValid: boolean) => void;
  isInvalid?: boolean;
  id: string;
}

const toText = (value: unknown): string =>
  value === undefined || value === null ? '' : String(value);

const toOptions = (values: unknown): Array<EuiComboBoxOptionOption<string>> =>
  Array.isArray(values) ? values.map((value) => ({ label: String(value) })) : [];

const isNumericItem = (descriptor: WorkflowInputDescriptor): boolean =>
  descriptor.itemKind === 'number' || descriptor.itemKind === 'integer';

/** One editable workflow input, rendered by its kind. Objects fall back to a JSON text area. */
export const WorkflowInputField = ({
  descriptor,
  value,
  onChange,
  onJsonValidityChange,
  isInvalid,
  id,
}: WorkflowInputFieldProps): React.JSX.Element => {
  const [jsonText, setJsonText] = useState(() =>
    value === undefined ? '' : JSON.stringify(value, null, 2)
  );
  const [isJsonInvalid, setIsJsonInvalid] = useState(false);

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
          isInvalid={isInvalid}
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
          isInvalid={isInvalid}
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
          isInvalid={isInvalid}
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
    case 'string':
    case 'date':
      return (
        <EuiFieldText
          id={id}
          fullWidth
          isInvalid={isInvalid}
          placeholder={descriptor.kind === 'date' ? '2026-01-31T00:00:00.000Z' : undefined}
          value={toText(value)}
          onChange={(event) => onChange(event.target.value === '' ? undefined : event.target.value)}
        />
      );
    default:
      return (
        <EuiTextArea
          id={id}
          fullWidth
          rows={4}
          isInvalid={isInvalid || isJsonInvalid}
          aria-describedby={isJsonInvalid ? `${id}-json-error` : undefined}
          placeholder={isJsonInvalid ? CONFIRM_MESSAGES.invalidJson : '{}'}
          value={jsonText}
          onChange={(event) => {
            const text = event.target.value;
            setJsonText(text);
            if (text.trim() === '') {
              setIsJsonInvalid(false);
              onJsonValidityChange?.(true);
              onChange(undefined);
              return;
            }
            try {
              const parsed: unknown = JSON.parse(text);
              setIsJsonInvalid(false);
              onJsonValidityChange?.(true);
              onChange(parsed);
            } catch {
              setIsJsonInvalid(true);
              onJsonValidityChange?.(false);
            }
          }}
        />
      );
  }
};
