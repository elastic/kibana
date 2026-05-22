/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { createStubDataView } from '@kbn/data-views-plugin/public/data_views/data_view.stub';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { screen, waitFor } from '@testing-library/react';
import { SourceFiltersTable } from './source_filters_table';
import { userEvent } from '@testing-library/user-event';

const createDataView = (
  sourceFilters = [{ value: 'time*' }, { value: 'nam*' }, { value: 'age*' }]
) =>
  createStubDataView({
    spec: {
      fields: {
        time: { name: 'time', type: 'date', searchable: true, aggregatable: true },
        name: { name: 'name', type: 'string', searchable: true, aggregatable: true },
        age: { name: 'age', type: 'number', searchable: true, aggregatable: true },
      },
      sourceFilters,
      title: 'test-data-view',
    },
  });

const fieldWildcardMatcher = (filters: string[]) => {
  const [query = ''] = filters;
  const normalizedQuery = query.replace('*', '');

  return (field: string) => field.includes(normalizedQuery);
};

const getFilterActionButton = (filterValue: string, buttonIndex: number) => {
  const button = getFilterRow(filterValue).querySelectorAll('button')[buttonIndex];

  if (!button) {
    throw new Error(`Unable to find action button ${buttonIndex} for filter ${filterValue}`);
  }

  return button;
};

const getFilterRow = (filterValue: string) => {
  const row = screen.getByText(filterValue).closest('tr');

  if (!row) throw new Error(`Unable to find row for filter ${filterValue}`);

  return row;
};

const renderSourceFiltersTable = ({
  filterFilter = '',
  indexPattern = createDataView(),
  saveIndexPattern = jest.fn(async () => {}),
}: Partial<React.ComponentProps<typeof SourceFiltersTable>> = {}) => {
  renderWithI18n(
    <SourceFiltersTable
      fieldWildcardMatcher={fieldWildcardMatcher}
      filterFilter={filterFilter}
      indexPattern={indexPattern}
      saveIndexPattern={saveIndexPattern}
    />
  );

  return { indexPattern, saveIndexPattern };
};

describe('SourceFiltersTable', () => {
  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {}); // Silent EUI warnings during tests
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should render normally', () => {
    renderSourceFiltersTable();

    expect(screen.getByText('time*')).toBeVisible();
    expect(screen.getByText('nam*')).toBeVisible();
    expect(screen.getByText('age*')).toBeVisible();
    expect(screen.getByTestId('fieldFilterInput')).toBeVisible();
    expect(screen.getByText('Add')).toBeVisible();
  });

  it('should filter based on the query bar', () => {
    renderSourceFiltersTable({ filterFilter: 'ti' });

    expect(screen.getByText('time*')).toBeVisible();
    expect(screen.queryByText('nam*')).not.toBeInTheDocument();
    expect(screen.queryByText('age*')).not.toBeInTheDocument();
  });

  it('should show a loading indicator when saving', async () => {
    const user = userEvent.setup();
    const saveIndexPattern = jest.fn(async () => {});

    renderSourceFiltersTable({
      indexPattern: createDataView([{ value: 'tim*' }]),
      saveIndexPattern,
    });

    await user.type(screen.getByTestId('fieldFilterInput'), 'na*');
    await user.click(screen.getByText('Add'));

    expect(saveIndexPattern).toHaveBeenCalled();
    expect(screen.getByText('tim*')).toBeVisible();
  });

  it('should show a delete modal', async () => {
    const user = userEvent.setup();
    renderSourceFiltersTable({ indexPattern: createDataView([{ value: 'tim*' }]) });

    await user.click(getFilterActionButton('tim*', 1));

    expect(screen.getByText("Delete field filter 'tim*'?")).toBeVisible();
  });

  it('should remove a filter', async () => {
    const user = userEvent.setup();
    const saveIndexPattern = jest.fn(async () => {});

    const { indexPattern } = renderSourceFiltersTable({
      indexPattern: createDataView([{ value: 'tim*' }, { value: 'na*' }]),
      saveIndexPattern,
    });
    await user.click(getFilterActionButton('tim*', 1));
    await user.click(screen.getByTestId('confirmModalConfirmButton'));

    expect(saveIndexPattern).toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.queryByText('tim*')).not.toBeInTheDocument();
    });

    expect(screen.getByText('na*')).toBeVisible();
    expect(indexPattern.sourceFilters).toEqual([{ value: 'na*', clientId: 2 }]);
  });

  it('should add a filter', async () => {
    const user = userEvent.setup();
    const saveIndexPattern = jest.fn(async () => {});

    const { indexPattern } = renderSourceFiltersTable({
      indexPattern: createDataView([{ value: 'tim*' }]),
      saveIndexPattern,
    });

    await user.type(screen.getByTestId('fieldFilterInput'), 'na*');
    await user.click(screen.getByText('Add'));

    expect(saveIndexPattern).toBeCalled();
    expect(await screen.findByText('na*')).toBeVisible();

    expect(indexPattern.sourceFilters).toEqual([{ value: 'tim*' }, { value: 'na*' }]);
  });

  it('should update a filter', async () => {
    const user = userEvent.setup();
    const saveIndexPattern = jest.fn(async () => {});

    const { indexPattern } = renderSourceFiltersTable({
      indexPattern: createDataView([{ value: 'tim*' }]),
      saveIndexPattern,
    });

    await user.click(screen.getByTestId('edit_filter-tim*'));
    await user.clear(screen.getByTestId('filter_input_tim*'));
    await user.type(screen.getByTestId('filter_input_tim*'), 'ti*');
    await user.click(screen.getByTestId('save_filter-tim*'));

    expect(saveIndexPattern).toBeCalled();
    expect(await screen.findByText('ti*')).toBeVisible();
    expect(indexPattern.sourceFilters).toEqual([{ value: 'ti*', clientId: 1 }]);
  });
});
