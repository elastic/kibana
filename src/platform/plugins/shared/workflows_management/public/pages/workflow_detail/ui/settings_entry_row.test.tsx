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
import { I18nProvider } from '@kbn/i18n-react';
import { SettingsEntryRow } from './settings_entry_row';
import type { ConstantField } from './workflow_settings_fields_model';

jest.mock('../../../features/workflow_visual_editor/ui/reference_capable_field', () => ({
  ReferenceCapableField: ({
    children,
    onChange,
  }: {
    children: (bind: {
      value: string;
      teachingPlaceholder: string;
      appendControls: null;
      reportChange: (next: string) => void;
      attachInputRef: () => undefined;
    }) => React.ReactElement;
    value: string;
    onChange: (next: string) => void;
  }) =>
    children({
      value,
      teachingPlaceholder: 'Type @',
      appendControls: null,
      reportChange: (next) => onChange(next),
      attachInputRef: () => undefined,
    }),
}));

const committedField: ConstantField = {
  id: 'const-1',
  name: 'region',
  type: 'string',
  value: 'us-east-1',
};

const renderConstantRow = (
  props: Partial<React.ComponentProps<typeof SettingsEntryRow>> & {
    mode: 'committed' | 'draft';
  }
) => {
  const onChange = jest.fn();
  const onCommit = jest.fn();
  const onDiscard = jest.fn();
  const onRequestDelete = jest.fn();

  const base =
    props.mode === 'draft'
      ? {
          kind: 'constant' as const,
          mode: 'draft' as const,
          field: committedField,
          siblings: [] as ConstantField[],
          onCommit,
          onDiscard,
        }
      : {
          kind: 'constant' as const,
          mode: 'committed' as const,
          field: committedField,
          siblings: [committedField],
          onChange,
          onRequestDelete,
        };

  const result = render(
    <I18nProvider>
      <SettingsEntryRow {...base} {...props} />
    </I18nProvider>
  );

  return { ...result, onChange, onCommit, onDiscard, onRequestDelete };
};

describe('SettingsEntryRow', () => {
  it('shows collapsed summary for committed entries', () => {
    renderConstantRow({ mode: 'committed' });

    const row = screen.getByTestId('workflowSettingsConstRow-const-1');
    expect(row).toBeInTheDocument();
    expect(row).toHaveTextContent('region');
    expect(row).toHaveTextContent('string');
  });

  it('calls onChange when expanded committed entry is edited', () => {
    const { onChange } = renderConstantRow({ mode: 'committed' });

    fireEvent.click(screen.getByTestId('workflowSettingsConstRow-const-1'));

    const nameInput = screen.getByTestId('workflowSettingsConstName-const-1');
    fireEvent.change(nameInput, { target: { value: 'aws_region' } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'const-1', name: 'aws_region' })
    );
  });

  it('commits draft entries on Done', () => {
    const { onCommit } = renderConstantRow({
      mode: 'draft',
      field: { ...committedField, id: 'const-draft', name: '', value: '' },
    });

    fireEvent.change(screen.getByTestId('workflowSettingsConstName-const-draft'), {
      target: { value: 'new_const' },
    });
    fireEvent.click(screen.getByTestId('workflowSettingsConstDone-const-draft'));

    expect(onCommit).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'const-draft', name: 'new_const' })
    );
  });

  it('discards draft entries without calling onChange', () => {
    const onChange = jest.fn();
    const { onDiscard } = renderConstantRow({
      mode: 'draft',
      field: { ...committedField, id: 'const-draft-2', name: 'draft_name', value: 'x' },
    });

    fireEvent.change(screen.getByTestId('workflowSettingsConstName-const-draft-2'), {
      target: { value: 'changed' },
    });
    fireEvent.click(screen.getByTestId('workflowSettingsConstDiscard-const-draft-2'));

    expect(onDiscard).toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });
});
