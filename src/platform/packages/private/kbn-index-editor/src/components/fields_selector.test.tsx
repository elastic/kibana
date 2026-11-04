/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { screen } from '@testing-library/react';
import userEvent, { PointerEventsCheckLevel } from '@testing-library/user-event';
import { FieldsSelector } from './fields_selector';

// EUI popover panels declare `pointer-events: none` during their open animation, which jsdom never
// completes, so skip user-event's pointer-events assertion.
const setupUser = () => userEvent.setup({ pointerEventsCheck: PointerEventsCheckLevel.Never });

const buildColumn = (name: string): DatatableColumn => ({
  id: name,
  name,
  meta: { type: 'string' },
});

const columns = ['alpha', 'beta', 'gamma', 'delta', 'epsilon'].map(buildColumn);

describe('FieldsSelector', () => {
  it('shows how many of the available fields are visible', () => {
    renderWithI18n(
      <FieldsSelector columns={columns} visibleColumns={['alpha', 'beta']} onChange={jest.fn()} />
    );

    expect(screen.getByRole('button', { name: /Fields \(2\/5\)/ })).toBeVisible();
  });

  it('reveals a hidden field, appending it after the already visible ones', async () => {
    const user = setupUser();
    const onChange = jest.fn();
    renderWithI18n(
      <FieldsSelector columns={columns} visibleColumns={['alpha', 'beta']} onChange={onChange} />
    );

    await user.click(screen.getByRole('button', { name: /Fields/ }));
    await user.click(screen.getByRole('option', { name: /delta/ }));

    expect(onChange).toHaveBeenCalledWith(['alpha', 'beta', 'delta']);
  });

  it('hides a visible field while keeping the order of the rest', async () => {
    const user = setupUser();
    const onChange = jest.fn();
    renderWithI18n(
      <FieldsSelector
        columns={columns}
        visibleColumns={['alpha', 'beta', 'gamma']}
        onChange={onChange}
      />
    );

    await user.click(screen.getByRole('button', { name: /Fields/ }));
    await user.click(screen.getByRole('option', { name: /beta/ }));

    expect(onChange).toHaveBeenCalledWith(['alpha', 'gamma']);
  });

  it('keeps at least one field displayed by ignoring an attempt to hide the last one', async () => {
    const user = setupUser();
    const onChange = jest.fn();
    renderWithI18n(
      <FieldsSelector columns={columns} visibleColumns={['alpha']} onChange={onChange} />
    );

    await user.click(screen.getByRole('button', { name: /Fields/ }));
    await user.click(screen.getByRole('option', { name: /alpha/ }));

    expect(onChange).not.toHaveBeenCalled();
  });

  it('filters the field list by the search term', async () => {
    const user = setupUser();
    renderWithI18n(<FieldsSelector columns={columns} visibleColumns={[]} onChange={jest.fn()} />);

    await user.click(screen.getByRole('button', { name: /Fields/ }));
    await user.type(screen.getByRole('searchbox'), 'ga');

    expect(screen.getByRole('option', { name: /gamma/ })).toBeVisible();
    expect(screen.queryByRole('option', { name: /alpha/ })).not.toBeInTheDocument();
  });
});
