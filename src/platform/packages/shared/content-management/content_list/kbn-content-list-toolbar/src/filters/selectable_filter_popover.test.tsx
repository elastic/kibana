/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { Query } from '@elastic/eui';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SelectableFilterPopover } from './selectable_filter_popover';

const options = [
  { key: 'prod', label: 'Production', value: 'Production', count: 3 },
  { key: 'arch', label: 'Archived', value: 'Archived', count: 1 },
];

describe('SelectableFilterPopover', () => {
  it('counts only active values that match an available option', () => {
    const query = Query.parse('')
      .addOrFieldValue('tag', 'Production', true, 'eq')
      .addOrFieldValue('tag', 'Missing', true, 'eq');

    render(
      <SelectableFilterPopover
        fieldName="tag"
        title="Tags"
        query={query}
        options={options}
        renderOption={(option) => <span>{option.label}</span>}
      />
    );

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.queryByText('2')).not.toBeInTheDocument();
  });

  it('hides the modifier tip and active badge in single-selection mode', async () => {
    render(
      <SelectableFilterPopover
        fieldName="sort"
        title="Sort by"
        query={Query.parse('').addOrFieldValue('sort', 'Production', true, 'eq')}
        options={options}
        singleSelection
        renderOption={(option) => <span>{option.label}</span>}
      />
    );

    fireEvent.click(screen.getByText('Sort by'));

    await waitFor(() => {
      expect(screen.queryByText(/\+ click exclude/)).not.toBeInTheDocument();
    });
    expect(screen.queryByText('1')).not.toBeInTheDocument();
  });

  it('uses the captured modifier key to add an exclude filter', async () => {
    const onChange = jest.fn();

    render(
      <SelectableFilterPopover
        fieldName="tag"
        title="Tags"
        query={Query.parse('')}
        onChange={onChange}
        options={options}
        renderOption={(option) => <span>{option.label}</span>}
      />
    );

    fireEvent.click(screen.getByText('Tags'));

    const productionOption = await screen.findByText('Production');

    fireEvent.mouseDown(productionOption, { ctrlKey: true });
    fireEvent.click(productionOption, { ctrlKey: true });

    await waitFor(() => {
      expect(onChange).toHaveBeenCalled();
    });

    expect(onChange.mock.calls[0][0].text).toContain('-tag:(Production)');
  });
});
