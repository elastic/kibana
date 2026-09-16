/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import type { InstallFormField } from '@kbn/workflows-library';
import { InstallForm } from './install_form';

// The connector picker has its own test; stub it so this one stays focused on
// the schema-driven dispatch (and needs no services/query providers).
jest.mock('./connector_field', () => ({
  ConnectorField: ({
    connectorType,
    onChange,
    'data-test-subj': dataTestSubj,
  }: {
    connectorType: string;
    onChange: (id: string) => void;
    'data-test-subj'?: string;
  }) => (
    <button type="button" data-test-subj={dataTestSubj} onClick={() => onChange('connector-1')}>
      {connectorType}
    </button>
  ),
}));

const FIELDS: InstallFormField[] = [
  { name: 'plain-text', inputType: 'text', label: 'Plain text', required: true },
  { name: 'long-text', inputType: 'textarea', description: 'A longer text.' },
  { name: 'amount', inputType: 'number', default: 7 },
  { name: 'enabled', inputType: 'boolean' },
  {
    name: 'severity',
    inputType: 'select',
    options: [
      { value: 'low', label: 'Low' },
      { value: 'high', label: 'High' },
    ],
  },
  { name: 'slack-connector', inputType: 'connector', connectorType: '.slack' },
  { name: 'target-index', inputType: 'esIndex' },
];

const fieldSubj = (name: string) => `workflowLibraryInstallForm-field-${name}`;

describe('InstallForm', () => {
  let onChange: jest.Mock;
  let onCommit: jest.Mock;

  const renderForm = (
    values: Record<string, unknown> = {},
    errors: Record<string, string | undefined> = {}
  ) =>
    render(
      <InstallForm
        fields={FIELDS}
        values={values}
        errors={errors}
        onChange={onChange}
        onCommit={onCommit}
      />
    );

  beforeEach(() => {
    jest.clearAllMocks();
    onChange = jest.fn();
    onCommit = jest.fn();
  });

  it('should render one control per field with its label and description', () => {
    renderForm();

    for (const field of FIELDS) {
      expect(screen.getByTestId(fieldSubj(field.name))).toBeInTheDocument();
    }
    expect(screen.getByText('Plain text')).toBeInTheDocument();
    // Unlabeled fields fall back to the field name.
    expect(screen.getByText('amount')).toBeInTheDocument();
    expect(screen.getByText('A longer text.')).toBeInTheDocument();
  });

  it('should change on keystroke but only commit on blur for text inputs', () => {
    renderForm();
    const input = screen.getByTestId(fieldSubj('plain-text'));

    fireEvent.change(input, { target: { value: 'hello' } });
    expect(onChange).toHaveBeenCalledWith('plain-text', 'hello');
    expect(onCommit).not.toHaveBeenCalled();

    fireEvent.blur(input, { target: { value: 'hello' } });
    expect(onCommit).toHaveBeenCalledWith('plain-text', 'hello');
  });

  it('should commit immediately for select inputs', () => {
    renderForm();

    fireEvent.change(screen.getByTestId(fieldSubj('severity')), { target: { value: 'high' } });

    expect(onChange).toHaveBeenCalledWith('severity', 'high');
    expect(onCommit).toHaveBeenCalledWith('severity', 'high');
  });

  it('should commit a real number (and undefined when cleared) for number inputs', () => {
    renderForm({ amount: 7 });
    const input = screen.getByTestId(fieldSubj('amount'));

    fireEvent.change(input, { target: { value: '42' } });
    expect(onCommit).toHaveBeenCalledWith('amount', 42);

    fireEvent.change(input, { target: { value: '' } });
    expect(onCommit).toHaveBeenCalledWith('amount', undefined);
  });

  it('should commit immediately for boolean switches', () => {
    renderForm();

    fireEvent.click(screen.getByTestId(fieldSubj('enabled')));

    expect(onCommit).toHaveBeenCalledWith('enabled', true);
  });

  it('should commit the picked connector id', () => {
    renderForm();

    fireEvent.click(screen.getByTestId(fieldSubj('slack-connector')));

    expect(onChange).toHaveBeenCalledWith('slack-connector', 'connector-1');
    expect(onCommit).toHaveBeenCalledWith('slack-connector', 'connector-1');
  });

  it('should render an esIndex field as a plain text input committing on blur', () => {
    renderForm();
    const input = screen.getByTestId(fieldSubj('target-index'));

    fireEvent.change(input, { target: { value: 'logs-*' } });
    expect(onCommit).not.toHaveBeenCalled();
    fireEvent.blur(input, { target: { value: 'logs-*' } });

    expect(onCommit).toHaveBeenCalledWith('target-index', 'logs-*');
  });

  it('should display the provided error on the field row', () => {
    renderForm({}, { 'plain-text': 'A value is required.' });

    expect(screen.getByText('A value is required.')).toBeInTheDocument();
  });
});
