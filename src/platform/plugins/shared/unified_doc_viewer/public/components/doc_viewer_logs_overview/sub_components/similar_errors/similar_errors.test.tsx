/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { SimilarErrors } from '.';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { fieldConstants } from '@kbn/discover-utils';
import { OPEN_IN_DISCOVER_LABEL } from '../../../observability/traces/common/constants';
import { DataSourcesProvider } from '../../../../hooks/use_data_sources';
import { setUnifiedDocViewerServices } from '../../../../plugin';
import { mockUnifiedDocViewerServices } from '../../../../__mocks__';
import { getEsqlQuery } from './get_esql_query';

const mockGenerateDiscoverLink = jest.fn((query) => (query ? 'http://discover/link' : undefined));
const mockGetESQLQueryColumnsRaw = jest.fn();

jest.mock('../../../../hooks/use_generate_discover_link', () => ({
  useGetGenerateDiscoverLink: () => ({
    generateDiscoverLink: mockGenerateDiscoverLink,
  }),
}));

jest.mock('@kbn/esql-utils', () => ({
  getESQLQueryColumnsRaw: (...args: unknown[]) => mockGetESQLQueryColumnsRaw(...args),
}));

jest.mock('./get_esql_query', () => {
  const actual = jest.requireActual('./get_esql_query');
  return {
    getEsqlQuery: jest.fn(actual.getEsqlQuery),
  };
});

const mockGetEsqlQuery = getEsqlQuery as jest.Mock;

jest.mock('../../../content_framework/lazy_content_framework_section', () => ({
  ContentFrameworkSection: ({ children, title, actions, description, ...rest }: any) => (
    <div data-test-subj="ContentFrameworkSection" {...rest}>
      <h2>{title}</h2>
      {description && <p>{description}</p>}
      {actions && actions.length > 0 && (
        <a data-test-subj="docViewerSimilarErrorsOpenInDiscoverButton" href={actions[0].href}>
          {actions[0].label}
        </a>
      )}
      {children}
    </div>
  ),
}));

jest.mock('./similar_errors_occurrences_chart', () => ({
  SimilarErrorsOccurrencesChart: ({ baseEsqlQuery, currentDocumentTimestamp }: any) => (
    <div
      data-test-subj="SimilarErrorsOccurrencesChart"
      data-current-document-timestamp={currentDocumentTimestamp}
    />
  ),
}));

setUnifiedDocViewerServices(mockUnifiedDocViewerServices);

const buildHit = (fields: Record<string, unknown> = {}) =>
  buildDataTableRecord({
    _index: 'logs-*',
    _id: 'test-id',
    _score: 1,
    _source: {
      '@timestamp': Date.now(),
      ...fields,
    },
  });

describe('SimilarErrors', () => {
  const indexes = { logs: 'logs-*', apm: {} };

  const errorDocFields = {
    [fieldConstants.SERVICE_NAME_FIELD]: 'test-service',
    [fieldConstants.ERROR_CULPRIT_FIELD]: 'test-culprit',
    message: 'test error message',
  };

  const renderSimilarErrors = (hit: ReturnType<typeof buildHit>) => {
    return render(
      <DataSourcesProvider indexes={indexes} profileId="test-profile">
        <SimilarErrors hit={hit} />
      </DataSourcesProvider>
    );
  };

  // Renders and waits until async column resolution has settled, signaled by
  // the Discover button that appears once the ES|QL query has been built.
  const renderSimilarErrorsAndSettle = async (hit: ReturnType<typeof buildHit>) => {
    const result = renderSimilarErrors(hit);
    await screen.findByTestId('docViewerSimilarErrorsOpenInDiscoverButton');
    return result;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGenerateDiscoverLink.mockImplementation((query) =>
      query ? 'http://discover/link' : undefined
    );
    // By default, resolve every candidate field as a queryable ES|QL column
    mockGetESQLQueryColumnsRaw.mockResolvedValue([
      { name: fieldConstants.SERVICE_NAME_FIELD, type: 'keyword' },
      { name: fieldConstants.ERROR_CULPRIT_FIELD, type: 'keyword' },
      { name: 'message', type: 'text' },
    ]);
  });

  describe('rendering', () => {
    it('renders section when all required fields are present', async () => {
      await renderSimilarErrorsAndSettle(buildHit(errorDocFields));

      expect(screen.getByTestId('docViewerSimilarErrorsSection')).toBeInTheDocument();
      expect(screen.getByText('Similar errors')).toBeInTheDocument();
      expect(screen.getByTestId('SimilarErrorsOccurrencesChart')).toBeInTheDocument();
    });

    it('does not render when serviceName is missing', () => {
      const hit = buildHit({
        [fieldConstants.ERROR_CULPRIT_FIELD]: 'test-culprit',
        message: 'test error message',
      });

      const { container } = renderSimilarErrors(hit);

      expect(container).toBeEmptyDOMElement();
    });

    it('does not render when no error fields are present', () => {
      const hit = buildHit({
        [fieldConstants.SERVICE_NAME_FIELD]: 'test-service',
      });

      const { container } = renderSimilarErrors(hit);

      expect(container).toBeEmptyDOMElement();
    });
  });

  describe('Discover link', () => {
    it('renders Discover link when query is generated', async () => {
      await renderSimilarErrorsAndSettle(buildHit(errorDocFields));

      expect(screen.getByTestId('docViewerSimilarErrorsOpenInDiscoverButton')).toBeInTheDocument();
      expect(screen.getByText(OPEN_IN_DISCOVER_LABEL)).toBeInTheDocument();
    });

    it('does not render Discover link when generateDiscoverLink returns undefined', async () => {
      mockGenerateDiscoverLink.mockReturnValue(undefined);

      renderSimilarErrors(buildHit(errorDocFields));

      await waitFor(() => expect(mockGetEsqlQuery).toHaveBeenCalled());
      expect(screen.getByTestId('docViewerSimilarErrorsSection')).toBeInTheDocument();
      expect(
        screen.queryByTestId('docViewerSimilarErrorsOpenInDiscoverButton')
      ).not.toBeInTheDocument();
    });
  });

  describe('Chart rendering', () => {
    it('renders chart', async () => {
      await renderSimilarErrorsAndSettle(buildHit(errorDocFields));

      expect(screen.getByTestId('SimilarErrorsOccurrencesChart')).toBeInTheDocument();
    });

    it('passes currentDocumentTimestamp to chart when timestamp is available', async () => {
      const timestamp = '2024-12-10T10:30:00.000Z';

      await renderSimilarErrorsAndSettle(buildHit({ ...errorDocFields, '@timestamp': timestamp }));

      const chart = screen.getByTestId('SimilarErrorsOccurrencesChart');
      expect(chart).toHaveAttribute('data-current-document-timestamp', timestamp);
    });

    it('handles array timestamp values correctly', async () => {
      const timestampArray = ['2024-12-10T10:30:00.000Z'];

      await renderSimilarErrorsAndSettle(
        buildHit({ ...errorDocFields, '@timestamp': timestampArray })
      );

      const chart = screen.getByTestId('SimilarErrorsOccurrencesChart');
      expect(chart).toHaveAttribute('data-current-document-timestamp', timestampArray[0]);
    });
  });

  describe('field resolution against log sources', () => {
    it('resolves columns through ES|QL against the log index pattern', async () => {
      renderSimilarErrors(buildHit(errorDocFields));

      // Columns are resolved via ES|QL rather than field caps: field caps does
      // not surface all mapping conflicts that ES|QL rejects (e.g. object vs text)
      await waitFor(() =>
        expect(mockGetESQLQueryColumnsRaw).toHaveBeenCalledWith(
          expect.objectContaining({
            esqlQuery: 'FROM logs-*',
          })
        )
      );
    });

    it('omits unmapped fields from the query', async () => {
      // error.culprit is not mapped in any index of the log sources
      mockGetESQLQueryColumnsRaw.mockResolvedValue([
        { name: fieldConstants.SERVICE_NAME_FIELD, type: 'keyword' },
        { name: 'message', type: 'text' },
      ]);

      await renderSimilarErrorsAndSettle(buildHit(errorDocFields));

      expect(mockGetEsqlQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({
          serviceName: 'test-service',
          culprit: undefined,
          message: { fieldName: 'message', value: 'test error message' },
        })
      );
    });

    it('omits fields with conflicting mappings from the query', async () => {
      // message is mapped with incompatible types across the log sources,
      // which ES|QL reports as an unsupported column
      mockGetESQLQueryColumnsRaw.mockResolvedValue([
        { name: fieldConstants.SERVICE_NAME_FIELD, type: 'keyword' },
        { name: fieldConstants.ERROR_CULPRIT_FIELD, type: 'keyword' },
        { name: 'message', type: 'unsupported', original_types: ['object', 'text'] },
      ]);

      await renderSimilarErrorsAndSettle(buildHit(errorDocFields));

      expect(mockGetEsqlQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({
          serviceName: 'test-service',
          culprit: 'test-culprit',
          message: undefined,
        })
      );
    });

    it('shows unavailable callout instead of the chart when no error field is queryable', async () => {
      mockGetESQLQueryColumnsRaw.mockResolvedValue([
        { name: fieldConstants.SERVICE_NAME_FIELD, type: 'keyword' },
      ]);

      renderSimilarErrors(buildHit(errorDocFields));

      expect(
        await screen.findByTestId('docViewerSimilarErrorsUnavailableCallout')
      ).toBeInTheDocument();
      expect(screen.queryByTestId('SimilarErrorsOccurrencesChart')).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('docViewerSimilarErrorsOpenInDiscoverButton')
      ).not.toBeInTheDocument();
      expect(mockGetEsqlQuery).not.toHaveBeenCalled();
    });

    it('shows unavailable callout when the service name field is not queryable', async () => {
      mockGetESQLQueryColumnsRaw.mockResolvedValue([{ name: 'message', type: 'text' }]);

      renderSimilarErrors(buildHit(errorDocFields));

      expect(
        await screen.findByTestId('docViewerSimilarErrorsUnavailableCallout')
      ).toBeInTheDocument();
      expect(screen.queryByTestId('SimilarErrorsOccurrencesChart')).not.toBeInTheDocument();
    });

    it('gates the service name on the column the query references, not the fallback column the value came from', async () => {
      // The document carries its service name in an OTel fallback column, and
      // only that fallback column is queryable — but getEsqlQuery references
      // the canonical ECS column in the WHERE clause, so no query can be built.
      mockGetESQLQueryColumnsRaw.mockResolvedValue([
        { name: 'resource.attributes.service.name', type: 'keyword' },
        { name: 'message', type: 'text' },
      ]);

      renderSimilarErrors(
        buildHit({
          'resource.attributes.service.name': 'test-service',
          message: 'test error message',
        })
      );

      expect(
        await screen.findByTestId('docViewerSimilarErrorsUnavailableCallout')
      ).toBeInTheDocument();
      expect(screen.queryByTestId('SimilarErrorsOccurrencesChart')).not.toBeInTheDocument();
    });

    it('builds the query for a document with a fallback service name when the canonical column is queryable', async () => {
      mockGetESQLQueryColumnsRaw.mockResolvedValue([
        { name: fieldConstants.SERVICE_NAME_FIELD, type: 'keyword' },
        { name: 'message', type: 'text' },
      ]);

      await renderSimilarErrorsAndSettle(
        buildHit({
          'resource.attributes.service.name': 'test-service',
          message: 'test error message',
        })
      );

      expect(mockGetEsqlQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({
          serviceName: 'test-service',
          message: { fieldName: 'message', value: 'test error message' },
        })
      );
    });

    it('queries all fields when column resolution fails', async () => {
      mockGetESQLQueryColumnsRaw.mockRejectedValue(new Error('columns unavailable'));

      await renderSimilarErrorsAndSettle(buildHit(errorDocFields));

      expect(mockGetEsqlQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({
          serviceName: 'test-service',
          culprit: 'test-culprit',
          message: { fieldName: 'message', value: 'test error message' },
        })
      );
    });
  });
});
