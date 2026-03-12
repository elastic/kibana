/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { MatchedItem } from '@kbn/data-views-plugin/public';
import type { IndicesListProps } from './indices_list';
import { I18nProvider } from '@kbn/i18n-react';
import { IndicesList, PER_PAGE_STORAGE_KEY } from './indices_list';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { screen } from '@testing-library/react';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import userEvent from '@testing-library/user-event';

const indices = [
  { name: 'kibana', tags: [] },
  { name: 'es', tags: [] },
] as unknown as MatchedItem[];

const secondPageIndex = { name: 'second-page', tags: [] } as unknown as MatchedItem;

const similarIndices = [
  { name: 'logstash', tags: [] },
  { name: 'some_logs', tags: [] },
] as unknown as MatchedItem[];

describe('IndicesList', () => {
  const commonProps: Omit<IndicesListProps, 'query'> = {
    indices,
    isExactMatch: jest.fn(() => false),
  };

  afterEach(() => {
    new Storage(localStorage).remove(PER_PAGE_STORAGE_KEY);
  });

  it('should render normally', () => {
    const { container } = renderWithI18n(<IndicesList {...commonProps} query="" />);

    expect(container.firstChild).toMatchSnapshot();
  });

  it('should change pages', async () => {
    new Storage(localStorage).set(PER_PAGE_STORAGE_KEY, 5);
    const user = userEvent.setup();
    const propsWithMoreIndices = {
      ...commonProps,
      indices: [...indices, ...indices, ...indices, secondPageIndex],
    };

    renderWithI18n(<IndicesList {...propsWithMoreIndices} query="" />);
    const paginationButton = screen.getByTestId('pagination-button-1');

    await user.click(paginationButton);

    expect(screen.getByText('second-page')).toBeVisible();
  });

  it('should change per page', async () => {
    const user = userEvent.setup();
    const moreIndices = [...indices, ...indices, ...indices, ...indices, ...indices, ...indices];

    renderWithI18n(<IndicesList {...commonProps} indices={moreIndices} query="" />);

    const rowsPerPageButton = screen.getByText('Rows per page: 10');
    let rows = screen.getAllByTestId('indicesListTableRow');
    expect(rows).toHaveLength(10);
    await user.click(rowsPerPageButton);

    const option1 = screen.getByTestId('tablePagination-5-rows');
    await user.click(option1);

    rows = screen.getAllByTestId('indicesListTableRow');
    expect(screen.getByText('Rows per page: 5')).toBeVisible();
    expect(rows).toHaveLength(5);
  });

  it('should highlight the query in the matches', () => {
    renderWithI18n(
      <IndicesList
        {...commonProps}
        query="es,ki"
        isExactMatch={(indexName) => indexName === 'es'}
      />
    );

    expect(screen.getByText('es').closest('strong')).toBeVisible();
    expect(screen.getByText('ki').closest('strong')).toBeVisible();
  });

  it('should highlight fully when an exact match', () => {
    renderWithI18n(
      <IndicesList
        {...commonProps}
        indices={similarIndices}
        query="logs*"
        isExactMatch={(indexName) => indexName === 'some_logs'}
      />
    );

    expect(screen.getByText('some_logs').closest('strong')).toBeVisible();
  });

  describe('updating props', () => {
    it('should render all new indices', () => {
      new Storage(localStorage).set(PER_PAGE_STORAGE_KEY, 25);
      const moreIndices = [
        ...indices,
        ...indices,
        ...indices,
        ...indices,
        ...indices,
        ...indices,
        ...indices,
        ...indices,
      ];

      const { rerender } = renderWithI18n(<IndicesList {...commonProps} query="" />);
      rerender(
        <I18nProvider>
          <IndicesList {...commonProps} query="" indices={moreIndices} />
        </I18nProvider>
      );

      expect(screen.getAllByRole('row')).toHaveLength(moreIndices.length);
    });
  });
});
