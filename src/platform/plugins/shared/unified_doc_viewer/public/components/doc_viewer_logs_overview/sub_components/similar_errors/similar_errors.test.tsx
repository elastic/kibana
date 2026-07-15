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
import { getEsqlQuery } from './get_esql_query';

const mockGenerateDiscoverLink = jest.fn((query) => (query ? 'http://discover/link' : undefined));
const mockGetFieldsForWildcard = jest.fn();

jest.mock('../../../../hooks/use_generate_discover_link', () => ({
  useGetGenerateDiscoverLink: () => ({
    generateDiscoverLink: mockGenerateDiscoverLink,
  }),
}));

jest.mock('../../../../plugin', () => ({
  getUnifiedDocViewerServices: () => ({
    data: {
      dataViews: {
        getFieldsForWildcard: mockGetFieldsForWildcard,
      },
    },
  }),
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

  const renderSimilarErrors = (hit: ReturnType<typeof buildHit>) => {
    return render(
      <DataSourcesProvider indexes={indexes} profileId="test-profile">
        <SimilarErrors hit={hit} />
      </DataSourcesProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGenerateDiscoverLink.mockImplementation((query) =>
      query ? 'http://discover/link' : undefined
    );
    // By default, resolve every requested field as queryable
    mockGetFieldsForWildcard.mockImplementation(({ fields }: { fields: string[] }) =>
      Promise.resolve(fields.map((name) => ({ name, type: 'string' })))
    );
  });

  describe('rendering', () => {
    it('renders section when all required fields are present', async () => {
      const hit = buildHit({
        [fieldConstants.SERVICE_NAME_FIELD]: 'test-service',
        [fieldConstants.ERROR_CULPRIT_FIELD]: 'test-culprit',
        message: 'test error message',
      });

      renderSimilarErrors(hit);

      expect(screen.getByTestId('docViewerSimilarErrorsSection')).toBeInTheDocument();
      expect(screen.getByText('Similar errors')).toBeInTheDocument();
      expect(await screen.findByTestId('SimilarErrorsOccurrencesChart')).toBeInTheDocument();
      await screen.findByTestId('docViewerSimilarErrorsOpenInDiscoverButton');
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
      const hit = buildHit({
        [fieldConstants.SERVICE_NAME_FIELD]: 'test-service',
        [fieldConstants.ERROR_CULPRIT_FIELD]: 'test-culprit',
        message: 'test error message',
      });

      renderSimilarErrors(hit);

      expect(
        await screen.findByTestId('docViewerSimilarErrorsOpenInDiscoverButton')
      ).toBeInTheDocument();
      expect(screen.getByText(OPEN_IN_DISCOVER_LABEL)).toBeInTheDocument();
    });

    it('does not render Discover link when generateDiscoverLink returns undefined', async () => {
      mockGenerateDiscoverLink.mockReturnValue(undefined);
      const hit = buildHit({
        [fieldConstants.SERVICE_NAME_FIELD]: 'test-service',
        [fieldConstants.ERROR_CULPRIT_FIELD]: 'test-culprit',
        message: 'test error message',
      });

      renderSimilarErrors(hit);

      await waitFor(() => expect(mockGetEsqlQuery).toHaveBeenCalled());
      expect(screen.getByTestId('docViewerSimilarErrorsSection')).toBeInTheDocument();
      expect(
        screen.queryByTestId('docViewerSimilarErrorsOpenInDiscoverButton')
      ).not.toBeInTheDocument();
    });
  });

  describe('Chart rendering', () => {
    it('renders chart', async () => {
      const hit = buildHit({
        [fieldConstants.SERVICE_NAME_FIELD]: 'test-service',
        [fieldConstants.ERROR_CULPRIT_FIELD]: 'test-culprit',
        message: 'test error message',
      });

      renderSimilarErrors(hit);

      expect(await screen.findByTestId('SimilarErrorsOccurrencesChart')).toBeInTheDocument();
      await screen.findByTestId('docViewerSimilarErrorsOpenInDiscoverButton');
    });

    it('passes currentDocumentTimestamp to chart when timestamp is available', async () => {
      const timestamp = '2024-12-10T10:30:00.000Z';
      const hit = buildHit({
        [fieldConstants.SERVICE_NAME_FIELD]: 'test-service',
        [fieldConstants.ERROR_CULPRIT_FIELD]: 'test-culprit',
        message: 'test error message',
        '@timestamp': timestamp,
      });

      renderSimilarErrors(hit);

      const chart = await screen.findByTestId('SimilarErrorsOccurrencesChart');
      expect(chart).toHaveAttribute('data-current-document-timestamp', timestamp);
      await screen.findByTestId('docViewerSimilarErrorsOpenInDiscoverButton');
    });

    it('handles array timestamp values correctly', async () => {
      const timestampArray = ['2024-12-10T10:30:00.000Z'];
      const hit = buildHit({
        [fieldConstants.SERVICE_NAME_FIELD]: 'test-service',
        [fieldConstants.ERROR_CULPRIT_FIELD]: 'test-culprit',
        message: 'test error message',
        '@timestamp': timestampArray,
      });

      renderSimilarErrors(hit);

      const chart = await screen.findByTestId('SimilarErrorsOccurrencesChart');
      expect(chart).toHaveAttribute('data-current-document-timestamp', timestampArray[0]);
      await screen.findByTestId('docViewerSimilarErrorsOpenInDiscoverButton');
    });
  });

  describe('field resolution against log sources', () => {
    const errorDocFields = {
      [fieldConstants.SERVICE_NAME_FIELD]: 'test-service',
      [fieldConstants.ERROR_CULPRIT_FIELD]: 'test-culprit',
      message: 'test error message',
    };

    it('requests field caps scoped to the candidate fields and log index pattern', async () => {
      renderSimilarErrors(buildHit(errorDocFields));

      await waitFor(() =>
        expect(mockGetFieldsForWildcard).toHaveBeenCalledWith(
          expect.objectContaining({
            pattern: 'logs-*',
            fields: expect.arrayContaining([
              fieldConstants.SERVICE_NAME_FIELD,
              fieldConstants.ERROR_CULPRIT_FIELD,
              'message',
            ]),
            allowNoIndex: true,
          })
        )
      );
    });

    it('omits unmapped fields from the query', async () => {
      // error.culprit is not mapped in any index of the log sources
      mockGetFieldsForWildcard.mockResolvedValue([
        { name: fieldConstants.SERVICE_NAME_FIELD, type: 'string' },
        { name: 'message', type: 'string' },
      ]);

      renderSimilarErrors(buildHit(errorDocFields));

      await screen.findByTestId('docViewerSimilarErrorsOpenInDiscoverButton');
      expect(mockGetEsqlQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({
          serviceName: 'test-service',
          culprit: undefined,
          message: { fieldName: 'message', value: 'test error message' },
        })
      );
    });

    it('omits fields with conflicting mappings from the query', async () => {
      // message is mapped with incompatible types across the log sources
      mockGetFieldsForWildcard.mockResolvedValue([
        { name: fieldConstants.SERVICE_NAME_FIELD, type: 'string' },
        { name: fieldConstants.ERROR_CULPRIT_FIELD, type: 'string' },
        { name: 'message', type: 'conflict' },
      ]);

      renderSimilarErrors(buildHit(errorDocFields));

      await screen.findByTestId('docViewerSimilarErrorsOpenInDiscoverButton');
      expect(mockGetEsqlQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({
          serviceName: 'test-service',
          culprit: 'test-culprit',
          message: undefined,
        })
      );
    });

    it('shows unavailable callout instead of the chart when no error field is queryable', async () => {
      mockGetFieldsForWildcard.mockResolvedValue([
        { name: fieldConstants.SERVICE_NAME_FIELD, type: 'string' },
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
      mockGetFieldsForWildcard.mockResolvedValue([{ name: 'message', type: 'string' }]);

      renderSimilarErrors(buildHit(errorDocFields));

      expect(
        await screen.findByTestId('docViewerSimilarErrorsUnavailableCallout')
      ).toBeInTheDocument();
      expect(screen.queryByTestId('SimilarErrorsOccurrencesChart')).not.toBeInTheDocument();
    });

    it('queries all fields when field resolution fails', async () => {
      mockGetFieldsForWildcard.mockRejectedValue(new Error('field caps unavailable'));

      renderSimilarErrors(buildHit(errorDocFields));

      await screen.findByTestId('docViewerSimilarErrorsOpenInDiscoverButton');
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
