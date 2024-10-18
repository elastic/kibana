/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { I18nProvider } from '@kbn/i18n-react';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { INDEX_DOCUMENTS_META_DEFAULT } from '../types';
import { DocumentList } from './document_list';
import '@testing-library/jest-dom';
export const DEFAULT_VALUES = {
  dataTelemetryIdPrefix: `entSearchContent-api`,
  docs: [],
  docsPerPage: 25,
  isLoading: true,
  mappings: undefined,
  meta: INDEX_DOCUMENTS_META_DEFAULT,
  onPaginate: () => {},
  setDocsPerPage: () => {},
};

const mockValues = { ...DEFAULT_VALUES };
describe('DocumentList', () => {
  test('render empty', async () => {
    const { container } = render(
      <I18nProvider>
        <DocumentList {...DEFAULT_VALUES} />
      </I18nProvider>
    );

    expect(container.querySelector('[data-testId="search-index-documents-result"]')).toBeNull();
    expect(container.querySelector('[aria-label="Pagination for document list"]')).not.toBeNull();
  });
  test('renders documents when results when there is data and mappings', () => {
    const values = {
      ...DEFAULT_VALUES,
      docs: [
        {
          _id: 'M9ntXoIBTq5dF-1Xnc8A',
          _index: 'kibana_sample_data_flights',
          _score: 1,
          _source: {
            AvgTicketPrice: 268.24159591388866,
          },
        },
        {
          _id: 'NNntXoIBTq5dF-1Xnc8A',
          _index: 'kibana_sample_data_flights',
          _score: 1,
          _source: {
            AvgTicketPrice: 68.91388866,
          },
        },
      ],
      mappings: {
        kibana_sample_data_flights: {
          mappings: {
            properties: {
              AvgTicketPrice: {
                type: 'float' as const,
              },
            },
          },
        },
      },
    };
    render(
      <I18nProvider>
        <DocumentList {...values} />
      </I18nProvider>
    );
    expect(screen.getByText('Document id: M9ntXoIBTq5dF-1Xnc8A')).toBeInTheDocument();
    expect(screen.getByText('Document id: NNntXoIBTq5dF-1Xnc8A')).toBeInTheDocument();
  });

  test('renders callout when total results are 10.000', () => {
    const values = {
      ...DEFAULT_VALUES,
      ...mockValues,
      meta: {
        ...INDEX_DOCUMENTS_META_DEFAULT,
        totalItemCount: 10000,
      },
    };
    render(
      <I18nProvider>
        <DocumentList {...values} />
      </I18nProvider>
    );
    expect(screen.getByText('Results are limited to 10,000 documents')).toBeInTheDocument();
  });
});
