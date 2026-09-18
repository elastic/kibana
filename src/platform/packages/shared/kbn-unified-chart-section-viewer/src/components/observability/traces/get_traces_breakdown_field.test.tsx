/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import type { DataView } from '@kbn/data-views-plugin/common';
import { DataViewField } from '@kbn/data-views-plugin/common';
import { DataViewSource, EsqlSource } from '@kbn/data-source';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import { UnifiedBreakdownFieldSelector } from '@kbn/unified-histogram';
import { getTracesBreakdownField } from './get_traces_breakdown_field';

const SERVICE_NAME_COLUMN: DatatableColumn = {
  id: 'service.name',
  name: 'service.name',
  meta: { type: 'string' },
};

const serviceNameField = new DataViewField({
  name: 'service.name',
  type: 'string',
  searchable: true,
  aggregatable: true,
});

const classicDataView = {
  id: 'traces-dv',
  getFieldByName: (name: string) => (name === 'service.name' ? serviceNameField : undefined),
  fields: [serviceNameField],
} as unknown as DataView;

describe('getTracesBreakdownField', () => {
  it('builds a DataViewField from ES|QL result columns', () => {
    const field = getTracesBreakdownField({
      breakdownField: 'service.name',
      isESQLQuery: true,
      columns: [SERVICE_NAME_COLUMN],
      dataView: undefined,
    });

    expect(field?.name).toBe('service.name');
    expect(field?.displayName).toBe('service.name');
  });

  it('returns undefined for ES|QL when the column is missing', () => {
    expect(
      getTracesBreakdownField({
        breakdownField: 'service.name',
        isESQLQuery: true,
        columns: [
          {
            id: 'span.name',
            name: 'span.name',
            meta: { type: 'string' },
          } satisfies DatatableColumn,
        ],
        dataView: undefined,
      })
    ).toBeUndefined();
  });

  it('resolves Classic breakdown from the DataView', () => {
    const field = getTracesBreakdownField({
      breakdownField: 'service.name',
      isESQLQuery: false,
      columns: undefined,
      dataView: classicDataView,
    });

    expect(field).toBe(serviceNameField);
  });

  it('returns undefined when no breakdown is selected', () => {
    expect(
      getTracesBreakdownField({
        breakdownField: undefined,
        isESQLQuery: true,
        columns: [SERVICE_NAME_COLUMN],
        dataView: undefined,
      })
    ).toBeUndefined();
  });
});

describe('traces breakdown toolbar selector', () => {
  afterEach(() => {
    EsqlSource.clearCache();
  });

  it('shows Breakdown by service.name for an ES|QL EsqlSource', async () => {
    const esqlSource = await EsqlSource.create({
      query: 'FROM traces-apm*',
      resultColumns: [SERVICE_NAME_COLUMN],
      timeFieldName: '@timestamp',
    });
    const field = getTracesBreakdownField({
      breakdownField: 'service.name',
      isESQLQuery: true,
      columns: [SERVICE_NAME_COLUMN],
      dataView: undefined,
    });

    render(
      <IntlProvider locale="en">
        <UnifiedBreakdownFieldSelector
          dataSource={esqlSource}
          breakdown={{ field }}
          esqlColumns={[SERVICE_NAME_COLUMN]}
          onBreakdownFieldChange={jest.fn()}
        />
      </IntlProvider>
    );

    const button = await screen.findByTestId('unifiedHistogramBreakdownSelectorButton');
    await waitFor(() => {
      expect(button).toHaveTextContent('Breakdown by');
    });
    expect(within(button).getByTestId('fullText')).toHaveTextContent('service.name');
  });

  it('shows Breakdown by service.name for a Classic DataViewSource', async () => {
    render(
      <IntlProvider locale="en">
        <UnifiedBreakdownFieldSelector
          dataSource={new DataViewSource(classicDataView)}
          breakdown={{
            field: getTracesBreakdownField({
              breakdownField: 'service.name',
              isESQLQuery: false,
              columns: undefined,
              dataView: classicDataView,
            }),
          }}
          onBreakdownFieldChange={jest.fn()}
        />
      </IntlProvider>
    );

    const button = await screen.findByTestId('unifiedHistogramBreakdownSelectorButton');
    await waitFor(() => {
      expect(button).toHaveTextContent('Breakdown by');
    });
    expect(within(button).getByTestId('fullText')).toHaveTextContent('service.name');
  });
});
