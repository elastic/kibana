/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiProvider } from '@elastic/eui';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { EsqlResponseError } from '../../common/errors/esql_response_error';
import { ExternalServicesProvider, type ExternalServices } from '../../context/external_services';
import { ChartSectionSearchError } from './chart_section_search_error';

const renderChartSectionSearchError = (
  ui: React.ReactElement,
  externalServices?: ExternalServices
) =>
  render(
    <EuiProvider highContrastMode={false}>
      <ExternalServicesProvider externalServices={externalServices}>{ui}</ExternalServicesProvider>
    </EuiProvider>
  );

describe('ChartSectionSearchError', () => {
  it('renders Discover ErrorCallout with title and error message', () => {
    const error = new Error('Network error');

    renderChartSectionSearchError(
      <ChartSectionSearchError error={error} title="Unable to retrieve search results" />
    );

    expect(screen.getByTestId('discoverErrorCalloutTitle')).toHaveTextContent(
      'Unable to retrieve search results'
    );
    expect(screen.getByTestId('discoverErrorCalloutMessage')).toHaveTextContent('Network error');
  });

  it('normalizes non-Error fetch failures before display', () => {
    renderChartSectionSearchError(
      <ChartSectionSearchError error="fetch failed" title="Unable to retrieve search results" />
    );

    expect(screen.getByTestId('discoverErrorCalloutMessage')).toHaveTextContent('fetch failed');
  });

  it('displays EsqlResponseError messages from embedded Elasticsearch errors', () => {
    const error = new EsqlResponseError({
      type: 'illegal_argument_exception',
      reason: 'invalid field',
    });

    renderChartSectionSearchError(
      <ChartSectionSearchError error={error} title="Unable to retrieve search results" />
    );

    expect(screen.getByTestId('discoverErrorCalloutMessage')).toHaveTextContent(
      'illegal_argument_exception: invalid field'
    );
  });

  it('renders ES|QL reference link when externalServices provides docLinks', () => {
    renderChartSectionSearchError(
      <ChartSectionSearchError error={new Error('x')} title="Unable to retrieve search results" />,
      {
        docLinks: {
          links: { query: { queryESQL: 'https://www.elastic.co/docs/reference/esql' } },
        },
      } as ExternalServices
    );

    expect(screen.getByTestId('discoverErrorCalloutESQLReferenceButton')).toHaveAttribute(
      'href',
      'https://www.elastic.co/docs/reference/esql'
    );
  });
});
