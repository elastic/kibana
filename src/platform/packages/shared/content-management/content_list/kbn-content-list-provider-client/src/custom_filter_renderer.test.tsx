/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';
import { CustomFilterRenderer } from './custom_filter_renderer';
import { defineContentListFilter } from './filters';
import { useClientFilterCounts } from './use_client_filter_counts';

jest.mock('./use_client_filter_counts');

const mockUseClientFilterCounts = useClientFilterCounts as jest.Mock;

type TypedItem = UserContentCommonSchema & { typeTitle?: string };

describe('CustomFilterRenderer', () => {
  const openPopover = () => fireEvent.click(screen.getByTestId('testFilter'));

  afterEach(() => jest.clearAllMocks());

  it('derives options from live facet counts when the dimension has no static options', () => {
    const dimension = defineContentListFilter<TypedItem>({
      id: 'visualizationType',
      queryField: 'typeTitle',
      title: 'Type',
      getItemValue: (item) => item.typeTitle,
    });
    mockUseClientFilterCounts.mockReturnValue(
      new Map([
        ['Pie', 1],
        ['Area', 3],
      ])
    );

    render(<CustomFilterRenderer filterDefinition={dimension} data-test-subj="testFilter" />);
    openPopover();

    const list = screen.getByTestId('testFilter-list');
    const labels = Array.from(list.querySelectorAll('li')).map((li) => li.textContent ?? '');
    // Only the values present in the current list, sorted by label.
    expect(labels.some((text) => text.includes('Area'))).toBe(true);
    expect(labels.some((text) => text.includes('Pie'))).toBe(true);
    expect(labels.findIndex((t) => t.includes('Area'))).toBeLessThan(
      labels.findIndex((t) => t.includes('Pie'))
    );
  });

  it('uses the static option universe when the dimension declares one', () => {
    const dimension = defineContentListFilter<TypedItem>({
      id: 'visualizationType',
      queryField: 'typeTitle',
      title: 'Type',
      getItemValue: (item) => item.typeTitle,
      options: [
        { value: 'Area', label: 'Area chart' },
        { value: 'Pie', label: 'Pie chart' },
      ],
    });
    mockUseClientFilterCounts.mockReturnValue(new Map([['Area', 3]]));

    render(<CustomFilterRenderer filterDefinition={dimension} data-test-subj="testFilter" />);
    openPopover();

    expect(screen.getByText('Area chart')).toBeInTheDocument();
    // Declared options render even with a zero count.
    expect(screen.getByText('Pie chart')).toBeInTheDocument();
  });
});
