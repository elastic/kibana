/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import {
  countConfiguredSteps,
  findDuplicateCaseIds,
  SwitchCasesField,
  switchCaseDuplicateKey,
  toSwitchCaseRows,
} from './switch_cases_field';

const renderField = (value: unknown, onChange = jest.fn()) => {
  const result = render(
    <I18nProvider>
      <SwitchCasesField value={value} onChange={onChange} />
    </I18nProvider>
  );
  return { ...result, onChange };
};

describe('switch_cases_field helpers', () => {
  it('normalizes cases from YAML-shaped values', () => {
    expect(
      toSwitchCaseRows([
        { match: 'ok', steps: [{ name: 'a', type: 'console' }] },
        { match: 2, steps: [] },
      ])
    ).toEqual([
      { id: 'case-0', match: 'ok', steps: [{ name: 'a', type: 'console' }] },
      { id: 'case-1', match: '2', steps: [] },
    ]);
  });

  it('detects trimmed case-insensitive duplicates', () => {
    const rows = toSwitchCaseRows([
      { match: ' OK ', steps: [] },
      { match: 'ok', steps: [] },
      { match: 'other', steps: [] },
    ]);
    expect(switchCaseDuplicateKey(' OK ')).toBe('ok');
    expect(findDuplicateCaseIds(rows)).toEqual(new Set(['case-0', 'case-1']));
  });

  it('counts nested configured steps under a case', () => {
    expect(countConfiguredSteps([])).toBe(0);
    expect(
      countConfiguredSteps([
        {
          name: 'gate',
          type: 'if',
          steps: [{ name: 'then_step', type: 'console' }],
          else: [{ name: 'else_step', type: 'console' }],
        },
      ])
    ).toBe(3);
  });
});

describe('SwitchCasesField', () => {
  it('renders existing cases and appends a focused empty row', () => {
    const { onChange } = renderField([
      { match: 'alpha', steps: [] },
      { match: 'beta', steps: [{ name: 'b', type: 'console' }] },
    ]);

    expect(screen.getByTestId('workflowSwitchCaseMatch-0')).toHaveValue('alpha');
    expect(screen.getByTestId('workflowSwitchCaseMatch-1')).toHaveValue('beta');

    fireEvent.click(screen.getByTestId('workflowSwitchCaseAdd'));

    expect(onChange).toHaveBeenCalledWith([
      { match: 'alpha', steps: [] },
      { match: 'beta', steps: [{ name: 'b', type: 'console' }] },
      { match: '', steps: [] },
    ]);
    expect(screen.getByTestId('workflowSwitchCaseMatch-2')).toHaveFocus();
  });

  it('warns on duplicate match values without blocking edits', () => {
    const { onChange } = renderField([
      { match: 'same', steps: [] },
      { match: 'other', steps: [] },
    ]);

    fireEvent.change(screen.getByTestId('workflowSwitchCaseMatch-1'), {
      target: { value: 'SAME' },
    });

    expect(onChange).toHaveBeenCalledWith([
      { match: 'same', steps: [] },
      { match: 'SAME', steps: [] },
    ]);
    expect(screen.getAllByText(/Duplicate value/i)).toHaveLength(2);
  });

  it('deletes empty cases immediately', () => {
    const { onChange } = renderField([
      { match: 'keep', steps: [{ name: 'k', type: 'console' }] },
      { match: 'drop', steps: [] },
    ]);

    fireEvent.click(screen.getByTestId('workflowSwitchCaseDelete-1'));

    expect(onChange).toHaveBeenCalledWith([
      { match: 'keep', steps: [{ name: 'k', type: 'console' }] },
    ]);
    expect(screen.queryByTestId('workflowSwitchCaseDeleteConfirm')).not.toBeInTheDocument();
  });

  it('confirms before deleting a case that has configured steps', () => {
    const { onChange } = renderField([
      { match: 'busy', steps: [{ name: 'inside', type: 'console' }] },
    ]);

    fireEvent.click(screen.getByTestId('workflowSwitchCaseDelete-0'));

    const modal = screen.getByTestId('workflowSwitchCaseDeleteConfirm');
    expect(modal).toBeInTheDocument();
    expect(within(modal).getByText(/Delete case "busy"/)).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.click(within(modal).getByText('Delete case'));

    expect(onChange).toHaveBeenCalledWith([]);
  });
});
