/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import { DEFAULT_PAGINATION_MODE } from '../..';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { screen } from '@testing-library/react';
import { servicesMock } from '../../__mocks__/services';
import { UnifiedDataTableFooter } from './data_table_footer';

describe('UnifiedDataTableFooter', () => {
  it('should not render anything when not on the last page', async () => {
    const { container } = renderWithI18n(
      <KibanaContextProvider services={servicesMock}>
        <UnifiedDataTableFooter
          data={servicesMock.data}
          fieldFormats={servicesMock.fieldFormats}
          hasScrolledToBottom={false}
          pageCount={5}
          pageIndex={0}
          paginationMode={DEFAULT_PAGINATION_MODE}
          rowCount={500}
          sampleSize={500}
          totalHits={1000}
        />
      </KibanaContextProvider>
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('should not render anything yet when all rows shown', async () => {
    const { container } = renderWithI18n(
      <UnifiedDataTableFooter
        data={servicesMock.data}
        fieldFormats={servicesMock.fieldFormats}
        hasScrolledToBottom={false}
        pageCount={5}
        pageIndex={4}
        paginationMode={DEFAULT_PAGINATION_MODE}
        rowCount={500}
        sampleSize={500}
        totalHits={500}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('should render a message for the last page', async () => {
    renderWithI18n(
      <UnifiedDataTableFooter
        data={servicesMock.data}
        fieldFormats={servicesMock.fieldFormats}
        hasScrolledToBottom={false}
        pageCount={5}
        pageIndex={4}
        paginationMode={DEFAULT_PAGINATION_MODE}
        rowCount={500}
        sampleSize={500}
        totalHits={1000}
      />
    );

    expect(
      screen.getByText(
        'Search results are limited to 500 documents. Add more search terms to narrow your search.'
      )
    ).toBeVisible();

    expect(screen.queryByTestId('dscGridSampleSizeFetchMoreLink')).not.toBeInTheDocument();
  });

  it('should render a message and the button for the last page', async () => {
    const mockLoadMore = jest.fn();

    renderWithI18n(
      <UnifiedDataTableFooter
        data={servicesMock.data}
        fieldFormats={servicesMock.fieldFormats}
        hasScrolledToBottom={false}
        isLoadingMore={false}
        onFetchMoreRecords={mockLoadMore}
        pageCount={5}
        pageIndex={4}
        paginationMode={DEFAULT_PAGINATION_MODE}
        rowCount={500}
        sampleSize={500}
        totalHits={1000}
      />
    );

    expect(screen.getByText('Search results are limited to 500 documents.')).toBeVisible();

    const button = screen.getByText('Load more');
    expect(button).toBeVisible();

    await userEvent.click(button);

    expect(mockLoadMore).toHaveBeenCalledTimes(1);
  });

  it('should render the load more button where pagination mode is set to singlePage and user has reached the bottom of the page', () => {
    const mockLoadMore = jest.fn();

    renderWithI18n(
      <UnifiedDataTableFooter
        data={servicesMock.data}
        fieldFormats={servicesMock.fieldFormats}
        hasScrolledToBottom={true}
        isLoadingMore={false}
        onFetchMoreRecords={mockLoadMore}
        pageCount={5}
        pageIndex={4}
        paginationMode={'singlePage'}
        rowCount={500}
        sampleSize={500}
        totalHits={1000}
      />
    );

    expect(screen.getByText('Search results are limited to 500 documents.')).toBeVisible();
    expect(screen.getByText('Load more')).toBeVisible();
  });

  it('should not render the load more button where pagination mode is set to singlePage and but the user has not reached the bottom of the page', () => {
    const mockLoadMore = jest.fn();

    renderWithI18n(
      <UnifiedDataTableFooter
        data={servicesMock.data}
        fieldFormats={servicesMock.fieldFormats}
        hasScrolledToBottom={false}
        isLoadingMore={false}
        onFetchMoreRecords={mockLoadMore}
        pageCount={5}
        pageIndex={4}
        paginationMode={'singlePage'}
        rowCount={500}
        sampleSize={500}
        totalHits={1000}
      />
    );

    expect(screen.queryByTestId('dscGridSampleSizeFetchMoreLink')).not.toBeInTheDocument();
  });

  it('should render a disabled button when loading more', async () => {
    const mockLoadMore = jest.fn();

    renderWithI18n(
      <UnifiedDataTableFooter
        data={servicesMock.data}
        fieldFormats={servicesMock.fieldFormats}
        hasScrolledToBottom={false}
        isLoadingMore={true}
        onFetchMoreRecords={mockLoadMore}
        pageCount={5}
        pageIndex={4}
        paginationMode={DEFAULT_PAGINATION_MODE}
        rowCount={500}
        sampleSize={500}
        totalHits={1000}
      />
    );
    expect(screen.getByText('Search results are limited to 500 documents.')).toBeVisible();

    const button = screen.getByRole('button', { name: 'Load more' });
    expect(button).toBeVisible();
    expect(button).toBeDisabled();

    expect(mockLoadMore).not.toHaveBeenCalled();
  });

  it('should render a message when max total limit is reached', async () => {
    renderWithI18n(
      <UnifiedDataTableFooter
        data={servicesMock.data}
        fieldFormats={servicesMock.fieldFormats}
        hasScrolledToBottom={false}
        pageCount={100}
        pageIndex={99}
        paginationMode={DEFAULT_PAGINATION_MODE}
        rowCount={10000}
        sampleSize={500}
        totalHits={11000}
      />
    );

    expect(
      screen.getByText(
        'Search results are limited to 10000 documents. Add more search terms to narrow your search.'
      )
    ).toBeVisible();
  });
});
