/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { SimilarErrors } from '.';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { fieldConstants } from '@kbn/discover-utils';
import { DataSourcesProvider } from '../../../../hooks/use_data_sources';

const mockGenerateDiscoverLink = jest.fn((query) => (query ? 'http://discover/link' : undefined));

jest.mock('../../../../hooks/use_generate_discover_link', () => ({
  useGetGenerateDiscoverLink: () => ({
    generateDiscoverLink: mockGenerateDiscoverLink,
  }),
}));

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
      <DataSourcesProvider indexes={indexes}>
        <SimilarErrors hit={hit} />
      </DataSourcesProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGenerateDiscoverLink.mockImplementation((query) =>
      query ? 'http://discover/link' : undefined
    );
  });

  describe('rendering', () => {
    it('renders section when all required fields are present', () => {
      const hit = buildHit({
        [fieldConstants.SERVICE_NAME_FIELD]: 'test-service',
        [fieldConstants.ERROR_CULPRIT_FIELD]: 'test-culprit',
        message: 'test error message',
      });

      renderSimilarErrors(hit);

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
    it('renders Discover link when query is generated', () => {
      const hit = buildHit({
        [fieldConstants.SERVICE_NAME_FIELD]: 'test-service',
        [fieldConstants.ERROR_CULPRIT_FIELD]: 'test-culprit',
        message: 'test error message',
      });

      renderSimilarErrors(hit);

      expect(screen.getByTestId('docViewerSimilarErrorsOpenInDiscoverButton')).toBeInTheDocument();
      expect(screen.getByText('Open in Discover')).toBeInTheDocument();
    });

    it('does not render Discover link when generateDiscoverLink returns undefined', () => {
      mockGenerateDiscoverLink.mockReturnValueOnce(undefined);
      const hit = buildHit({
        [fieldConstants.SERVICE_NAME_FIELD]: 'test-service',
        [fieldConstants.ERROR_CULPRIT_FIELD]: 'test-culprit',
        message: 'test error message',
      });

      renderSimilarErrors(hit);

      expect(screen.getByTestId('docViewerSimilarErrorsSection')).toBeInTheDocument();
      expect(
        screen.queryByTestId('docViewerSimilarErrorsOpenInDiscoverButton')
      ).not.toBeInTheDocument();
    });
  });

  describe('Chart rendering', () => {
    it('renders chart', () => {
      const hit = buildHit({
        [fieldConstants.SERVICE_NAME_FIELD]: 'test-service',
        [fieldConstants.ERROR_CULPRIT_FIELD]: 'test-culprit',
        message: 'test error message',
      });

      renderSimilarErrors(hit);

      expect(screen.getByTestId('SimilarErrorsOccurrencesChart')).toBeInTheDocument();
    });

    it('passes currentDocumentTimestamp to chart when timestamp is available', () => {
      const timestamp = '2024-12-10T10:30:00.000Z';
      const hit = buildHit({
        [fieldConstants.SERVICE_NAME_FIELD]: 'test-service',
        [fieldConstants.ERROR_CULPRIT_FIELD]: 'test-culprit',
        message: 'test error message',
        '@timestamp': timestamp,
      });

      renderSimilarErrors(hit);

      const chart = screen.getByTestId('SimilarErrorsOccurrencesChart');
      expect(chart).toHaveAttribute('data-current-document-timestamp', timestamp);
    });

    it('handles array timestamp values correctly', () => {
      const timestampArray = ['2024-12-10T10:30:00.000Z'];
      const hit = buildHit({
        [fieldConstants.SERVICE_NAME_FIELD]: 'test-service',
        [fieldConstants.ERROR_CULPRIT_FIELD]: 'test-culprit',
        message: 'test error message',
        '@timestamp': timestampArray,
      });

      renderSimilarErrors(hit);

      const chart = screen.getByTestId('SimilarErrorsOccurrencesChart');
      expect(chart).toHaveAttribute('data-current-document-timestamp', timestampArray[0]);
    });
  });
});
