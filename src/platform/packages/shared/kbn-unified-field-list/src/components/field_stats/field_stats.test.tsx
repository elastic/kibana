/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { act, screen, within } from '@testing-library/react';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { coreMock } from '@kbn/core/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { fieldFormatsServiceMock } from '@kbn/field-formats-plugin/public/mocks';
import { loadFieldStats } from '../../services/field_stats';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { DataViewField } from '@kbn/data-views-plugin/common';
import type { FieldStatsResponse } from '../../types';
import type { FieldStatsWithKbnQuery } from './field_stats';
import FieldStats from './field_stats';

jest.mock('../../services/field_stats');

const mockedServices = {
  data: dataPluginMock.createStartContract(),
  dataViews: dataViewPluginMocks.createStartContract(),
  fieldFormats: fieldFormatsServiceMock.createStartContract(),
  charts: chartPluginMock.createSetupContract(),
  uiSettings: coreMock.createStart().uiSettings,
};

const mockedLoadFieldStats = jest.mocked(loadFieldStats);

describe('UnifiedFieldList FieldStats', () => {
  let defaultProps: FieldStatsWithKbnQuery;
  let dataView: DataView;

  beforeEach(() => {
    dataView = {
      id: '1',
      title: 'my-fake-index-pattern',
      timeFieldName: 'timestamp',
      fields: [
        {
          name: 'timestamp',
          displayName: 'timestampLabel',
          type: 'date',
          aggregatable: true,
          searchable: true,
        },
        {
          name: 'bytes',
          displayName: 'bytesLabel',
          type: 'number',
          aggregatable: true,
          searchable: true,
        },
        {
          name: 'memory',
          displayName: 'memory',
          type: 'number',
          aggregatable: true,
          searchable: true,
        },
        {
          name: 'unsupported',
          displayName: 'unsupported',
          type: 'geo',
          aggregatable: true,
          searchable: true,
        },
        {
          name: 'source',
          displayName: 'source',
          type: 'string',
          aggregatable: true,
          searchable: true,
        },
        {
          name: 'ip_range',
          displayName: 'ip_range',
          type: 'ip_range',
          aggregatable: true,
          searchable: true,
        },
        {
          name: 'machine.ram',
          displayName: 'machine.ram',
          type: 'number',
          aggregatable: true,
          searchable: true,
        },
        {
          name: 'geo_shape',
          displayName: 'geo_shape',
          type: 'geo_shape',
          aggregatable: true,
          searchable: true,
        },
        {
          name: 'bytes_counter',
          timeSeriesMetric: 'counter',
          type: 'number',
          esTypes: ['long'],
          aggregatable: true,
          searchable: true,
          count: 10,
          readFromDocValues: true,
          scripted: false,
          isMapped: true,
        },
      ],
      getFormatterForField: jest.fn(() => ({
        convert: jest.fn((s: unknown) => JSON.stringify(s)),
      })),
    } as unknown as DataView;

    defaultProps = {
      services: mockedServices,
      dataViewOrDataViewId: dataView,
      field: dataView.fields.find((f) => f.name === 'bytes')!,
      fromDate: 'now-7d',
      toDate: 'now',
      query: { query: '', language: 'lucene' },
      filters: [],
      'data-test-subj': 'testing',
    };

    mockedServices.dataViews.get.mockImplementation(() => {
      return Promise.resolve(dataView);
    });
    mockedLoadFieldStats.mockReset();
    mockedLoadFieldStats.mockResolvedValue({});
  });

  it('should request field stats with correct params', async () => {
    const NUMBER_OF_DOCUMENTS = 4633;
    let resolveFunction!: (value: FieldStatsResponse<string | number>) => void;

    mockedLoadFieldStats.mockImplementation(() => {
      return new Promise((resolve) => {
        resolveFunction = resolve;
      });
    });

    renderWithI18n(
      <FieldStats
        {...defaultProps}
        query={{ query: 'geo.src : "US"', language: 'kuery' }}
        filters={[
          {
            query: { match: { phrase: { 'geo.dest': 'US' } } },
            meta: {},
          },
        ]}
        fromDate="now-14d"
        toDate="now-7d"
      />
    );

    expect(mockedLoadFieldStats).toHaveBeenCalledWith({
      abortController: new AbortController(),
      services: { data: mockedServices.data },
      dataView,
      dslQuery: {
        bool: {
          must: [],
          filter: [
            {
              bool: {
                should: [{ match_phrase: { 'geo.src': 'US' } }],
                minimum_should_match: 1,
              },
            },
            {
              match: { phrase: { 'geo.dest': 'US' } },
            },
          ],
          should: [],
          must_not: [],
        },
      },
      fromDate: 'now-14d',
      toDate: 'now-7d',
      field: defaultProps.field,
    });

    expect(screen.getByTestId('testing-statsLoading')).toBeVisible();

    act(() => {
      resolveFunction!({
        totalDocuments: NUMBER_OF_DOCUMENTS,
        sampledDocuments: NUMBER_OF_DOCUMENTS,
        sampledValues: NUMBER_OF_DOCUMENTS,
        histogram: {
          buckets: [{ count: 705, key: 0 }],
        },
        topValues: {
          buckets: [{ count: 147, key: 0 }],
        },
      });
    });

    expect(await screen.findByTestId('testing-statsLoading')).not.toBeInTheDocument();

    expect(screen.getByText('Top values')).toBeVisible();
    expect(screen.getByText('Distribution')).toBeVisible();
    expect(screen.getByTestId('testing-statsFooter')).toHaveTextContent(
      `Calculated from ${NUMBER_OF_DOCUMENTS} records.`
    );

    expect(mockedLoadFieldStats).toHaveBeenCalledTimes(1);
  });

  it('should request field stats with dsl query', async () => {
    const NUMBER_OF_DOCUMENTS = 4633;
    let resolveFunction!: (value: FieldStatsResponse<string | number>) => void;

    mockedLoadFieldStats.mockImplementation(() => {
      return new Promise((resolve) => {
        resolveFunction = resolve;
      });
    });

    renderWithI18n(
      <FieldStats
        {...{
          services: mockedServices,
          dataViewOrDataViewId: dataView,
          field: dataView.fields.find((f) => f.name === 'bytes')!,
          'data-test-subj': 'testing',
        }}
        dslQuery={{ bool: { filter: { range: { field: 'duration', gte: 3000 } } } }}
        fromDate="now-14d"
        toDate="now-7d"
      />
    );

    expect(mockedLoadFieldStats).toHaveBeenCalledWith({
      abortController: new AbortController(),
      services: { data: mockedServices.data },
      dataView,
      dslQuery: { bool: { filter: { range: { field: 'duration', gte: 3000 } } } },
      fromDate: 'now-14d',
      toDate: 'now-7d',
      field: defaultProps.field,
    });

    expect(screen.getByTestId('testing-statsLoading')).toBeVisible();

    act(() => {
      resolveFunction!({
        totalDocuments: NUMBER_OF_DOCUMENTS,
        sampledDocuments: NUMBER_OF_DOCUMENTS,
        sampledValues: NUMBER_OF_DOCUMENTS,
        histogram: {
          buckets: [{ count: 705, key: 0 }],
        },
        topValues: {
          buckets: [{ count: 147, key: 0 }],
        },
      });
    });

    expect(await screen.findByTestId('testing-statsLoading')).not.toBeInTheDocument();

    expect(screen.getByText('Top values')).toBeVisible();
    expect(screen.getByText('Distribution')).toBeVisible();
    expect(screen.getByTestId('testing-statsFooter')).toHaveTextContent(
      `Calculated from ${NUMBER_OF_DOCUMENTS} records.`
    );

    expect(mockedLoadFieldStats).toHaveBeenCalledTimes(1);
  });

  it('should not request field stats for range fields', async () => {
    renderWithI18n(
      <FieldStats {...defaultProps} field={dataView.fields.find((f) => f.name === 'ip_range')!} />
    );

    expect(mockedLoadFieldStats).toHaveBeenCalled();

    expect(await screen.findByText('Analysis is not available for this field.')).toBeVisible();
  });

  it('should request field examples for geo fields', async () => {
    renderWithI18n(
      <FieldStats {...defaultProps} field={dataView.fields.find((f) => f.name === 'geo_shape')!} />
    );

    expect(mockedLoadFieldStats).toHaveBeenCalled();

    expect(await screen.findByText('No field data for the current search.')).toBeVisible();
  });

  it('should render a message if no data is found', async () => {
    renderWithI18n(<FieldStats {...defaultProps} />);

    expect(mockedLoadFieldStats).toHaveBeenCalled();

    expect(await screen.findByText('No field data for the current search.')).toBeVisible();
  });

  it('should render a message if no data is found in sample', async () => {
    const TOTAL_DOCUMENTS = 10000;
    const SAMPLED_DOCUMENTS = 5000;
    let resolveFunction!: (value: FieldStatsResponse<string | number>) => void;

    mockedLoadFieldStats.mockImplementation(() => {
      return new Promise((resolve) => {
        resolveFunction = resolve;
      });
    });

    renderWithI18n(<FieldStats {...defaultProps} />);

    act(() => {
      resolveFunction!({
        totalDocuments: TOTAL_DOCUMENTS,
        sampledDocuments: SAMPLED_DOCUMENTS,
        sampledValues: 0,
      });
    });

    expect(mockedLoadFieldStats).toHaveBeenCalledTimes(1);

    expect(
      await screen.findByText(`No field data for ${SAMPLED_DOCUMENTS} sample records.`)
    ).toBeVisible();
  });

  it('should render Top Values field stats correctly for a keyword field', async () => {
    const SAMPLED_VALUES = 3248;
    const SUCCESS_COUNT = 1349;
    const INFO_COUNT = 1206;
    const SECURITY_COUNT = 329;
    const WARNING_COUNT = 164;
    const ERROR_COUNT = 111;
    const LOGIN_COUNT = 89;

    let resolveFunction!: (value: FieldStatsResponse<string | number>) => void;

    mockedLoadFieldStats.mockImplementation(() => {
      return new Promise((resolve) => {
        resolveFunction = resolve;
      });
    });

    renderWithI18n(
      <FieldStats
        {...defaultProps}
        query={{ language: 'kuery', query: '' }}
        filters={[]}
        fromDate="now-7d"
        toDate="now"
      />
    );

    expect(mockedLoadFieldStats).toHaveBeenCalledWith({
      abortController: new AbortController(),
      services: { data: mockedServices.data },
      dataView,
      fromDate: 'now-7d',
      toDate: 'now',
      dslQuery: {
        bool: {
          must: [],
          filter: [],
          should: [],
          must_not: [],
        },
      },
      field: defaultProps.field,
    });

    expect(screen.getByTestId('testing-statsLoading')).toBeVisible();

    act(() => {
      resolveFunction!({
        totalDocuments: 1624,
        sampledDocuments: 1624,
        sampledValues: SAMPLED_VALUES,
        topValues: {
          buckets: [
            {
              count: SUCCESS_COUNT,
              key: 'success',
            },
            {
              count: INFO_COUNT,
              key: 'info',
            },
            {
              count: SECURITY_COUNT,
              key: 'security',
            },
            {
              count: WARNING_COUNT,
              key: 'warning',
            },
            {
              count: ERROR_COUNT,
              key: 'error',
            },
            {
              count: LOGIN_COUNT,
              key: 'login',
            },
          ],
        },
      });
    });

    expect(await screen.findByTestId('testing-statsLoading')).not.toBeInTheDocument();

    expect(mockedLoadFieldStats).toHaveBeenCalledTimes(1);

    expect(screen.getByText('Top values')).toBeVisible();
    expect(screen.getByTestId('testing-statsFooter')).toHaveTextContent(
      `Calculated from 1624 records.`
    );

    const valuesContainers = screen.getAllByTestId('testing-topValues-bucket');
    expect(valuesContainers).toHaveLength(6);

    expect(valuesContainers[0]).toHaveTextContent(
      `"success"${((SUCCESS_COUNT / SAMPLED_VALUES) * 100).toFixed(1)}%`
    );
    expect(valuesContainers[1]).toHaveTextContent(
      `"info"${((INFO_COUNT / SAMPLED_VALUES) * 100).toFixed(1)}%`
    );
    expect(valuesContainers[2]).toHaveTextContent(
      `"security"${((SECURITY_COUNT / SAMPLED_VALUES) * 100).toFixed(1)}%`
    );
    expect(valuesContainers[3]).toHaveTextContent(
      `"warning"${((WARNING_COUNT / SAMPLED_VALUES) * 100).toFixed(1)}%`
    );
    expect(valuesContainers[4]).toHaveTextContent(
      `"error"${((ERROR_COUNT / SAMPLED_VALUES) * 100).toFixed(1)}%`
    );
    expect(valuesContainers[5]).toHaveTextContent(
      `"login"${((LOGIN_COUNT / SAMPLED_VALUES) * 100).toFixed(1)}%`
    );
  });

  it('should render Examples correctly for a non-aggregatable field', async () => {
    const SAMPLED_VALUES = 3248;
    const SUCCESS_COUNT = 1349;
    const INFO_COUNT = 1206;
    const SECURITY_COUNT = 329;
    const WARNING_COUNT = 164;
    const ERROR_COUNT = 111;
    const LOGIN_COUNT = 89;

    let resolveFunction!: (value: FieldStatsResponse<string | number>) => void;

    mockedLoadFieldStats.mockImplementation(() => {
      return new Promise((resolve) => {
        resolveFunction = resolve;
      });
    });

    renderWithI18n(
      <FieldStats
        {...defaultProps}
        field={
          {
            name: 'test_text',
            type: 'string',
            aggregatable: false,
          } as unknown as DataViewField
        }
      />
    );

    expect(screen.getByTestId('testing-statsLoading')).toBeVisible();

    act(() => {
      resolveFunction!({
        totalDocuments: 1624,
        sampledDocuments: 1624,
        sampledValues: SAMPLED_VALUES,
        topValues: {
          areExamples: true,
          buckets: [
            {
              count: SUCCESS_COUNT,
              key: 'success',
            },
            {
              count: INFO_COUNT,
              key: 'info',
            },
            {
              count: SECURITY_COUNT,
              key: 'security',
            },
            {
              count: WARNING_COUNT,
              key: 'warning',
            },
            {
              count: ERROR_COUNT,
              key: 'error',
            },
            {
              count: 89,
              key: 'login',
            },
          ],
        },
      });
    });

    expect(await screen.findByTestId('testing-statsLoading')).not.toBeInTheDocument();

    expect(mockedLoadFieldStats).toHaveBeenCalledTimes(1);

    expect(screen.getByText('Examples')).toBeVisible();

    const valuesContainers = screen.getAllByTestId('testing-topValues-bucket');
    expect(screen.getByTestId('testing-statsFooter')).toHaveTextContent(
      `Calculated from 1624 records.`
    );

    expect(valuesContainers).toHaveLength(6);
    expect(valuesContainers[0]).toHaveTextContent(
      `"success"${((SUCCESS_COUNT / SAMPLED_VALUES) * 100).toFixed(1)}%`
    );
    expect(valuesContainers[1]).toHaveTextContent(
      `"info"${((INFO_COUNT / SAMPLED_VALUES) * 100).toFixed(1)}%`
    );
    expect(valuesContainers[2]).toHaveTextContent(
      `"security"${((SECURITY_COUNT / SAMPLED_VALUES) * 100).toFixed(1)}%`
    );
    expect(valuesContainers[3]).toHaveTextContent(
      `"warning"${((WARNING_COUNT / SAMPLED_VALUES) * 100).toFixed(1)}%`
    );
    expect(valuesContainers[4]).toHaveTextContent(
      `"error"${((ERROR_COUNT / SAMPLED_VALUES) * 100).toFixed(1)}%`
    );
    expect(valuesContainers[5]).toHaveTextContent(
      `"login"${((LOGIN_COUNT / SAMPLED_VALUES) * 100).toFixed(1)}%`
    );
  });

  it('should render Histogram field stats correctly for a date field', async () => {
    let resolveFunction!: (value: FieldStatsResponse<string | number>) => void;

    mockedLoadFieldStats.mockImplementation(() => {
      return new Promise((resolve) => {
        resolveFunction = resolve;
      });
    });

    renderWithI18n(
      <FieldStats
        {...defaultProps}
        field={dataView.fields[0]}
        query={{ language: 'kuery', query: '' }}
        filters={[]}
        fromDate="now-1h"
        toDate="now"
      />
    );

    expect(mockedLoadFieldStats).toHaveBeenCalledWith({
      abortController: new AbortController(),
      services: { data: mockedServices.data },
      dataView,
      fromDate: 'now-1h',
      toDate: 'now',
      dslQuery: {
        bool: {
          must: [],
          filter: [],
          should: [],
          must_not: [],
        },
      },
      field: dataView.fields[0],
    });

    expect(screen.getByTestId('testing-statsLoading')).toBeVisible();

    act(() => {
      resolveFunction!({
        totalDocuments: 13,
        histogram: {
          buckets: [
            {
              count: 1,
              key: 1660564080000,
            },
            {
              count: 2,
              key: 1660564440000,
            },
            {
              count: 3,
              key: 1660564800000,
            },
            {
              count: 1,
              key: 1660565160000,
            },
            {
              count: 2,
              key: 1660565520000,
            },
            {
              count: 0,
              key: 1660565880000,
            },
            {
              count: 1,
              key: 1660566240000,
            },
            {
              count: 1,
              key: 1660566600000,
            },
            {
              count: 1,
              key: 1660566960000,
            },
            {
              count: 1,
              key: 1660567320000,
            },
          ],
        },
      });
    });

    expect(await screen.findByTestId('testing-statsLoading')).not.toBeInTheDocument();

    expect(mockedLoadFieldStats).toHaveBeenCalledTimes(1);

    expect(screen.queryByTestId('testing-topValues')).not.toBeInTheDocument();

    expect(screen.getByText('Time distribution')).toBeVisible();
    expect(screen.getByTestId('testing-histogram')).toBeVisible();
    expect(screen.getByTestId('testing-statsFooter')).toHaveTextContent(
      `Calculated from 13 records.`
    );
  });

  it('should render Top Values & Distribution field stats correctly for a number field', async () => {
    const SAMPLED_VALUES = 23;
    const VALUE_1 = 12;
    const VALUE_2 = 13;
    const COUNT_1 = 17;
    const COUNT_2 = 6;

    let resolveFunction!: (value: FieldStatsResponse<string | number>) => void;

    mockedLoadFieldStats.mockImplementation(() => {
      return new Promise((resolve) => {
        resolveFunction = resolve;
      });
    });

    const FIELD = dataView.fields.find((f) => f.name === 'machine.ram')!;

    renderWithI18n(
      <FieldStats
        {...defaultProps}
        field={FIELD}
        query={{ language: 'kuery', query: '' }}
        filters={[]}
        fromDate="now-1h"
        toDate="now"
      />
    );

    expect(mockedLoadFieldStats).toHaveBeenCalledWith({
      abortController: new AbortController(),
      services: { data: mockedServices.data },
      dataView,
      fromDate: 'now-1h',
      toDate: 'now',
      dslQuery: {
        bool: {
          must: [],
          filter: [],
          should: [],
          must_not: [],
        },
      },
      field: FIELD,
    });

    expect(screen.getByTestId('testing-statsLoading')).toBeVisible();

    act(() => {
      resolveFunction!({
        totalDocuments: 100,
        sampledDocuments: 23,
        sampledValues: SAMPLED_VALUES,
        histogram: {
          buckets: [
            {
              count: COUNT_1,
              key: VALUE_1,
            },
            {
              count: COUNT_2,
              key: VALUE_2,
            },
          ],
        },
        topValues: {
          buckets: [
            {
              count: COUNT_1,
              key: VALUE_1,
            },
            {
              count: COUNT_2,
              key: VALUE_2,
            },
          ],
        },
      });
    });

    expect(await screen.findByTestId('testing-statsLoading')).not.toBeInTheDocument();

    expect(mockedLoadFieldStats).toHaveBeenCalledTimes(1);

    expect(screen.getByText('Top values')).toBeVisible();
    expect(screen.getByText('Distribution')).toBeVisible();
    expect(screen.getByTestId('testing-statsFooter')).toHaveTextContent(
      `Calculated from 23 sample records.`
    );

    const valuesContainers = screen.getAllByTestId('testing-topValues-bucket');
    expect(valuesContainers).toHaveLength(2);

    expect(valuesContainers[0]).toHaveTextContent(
      `${VALUE_1}${((COUNT_1 / SAMPLED_VALUES) * 100).toFixed(1)}%`
    );
    expect(valuesContainers[1]).toHaveTextContent(
      `${VALUE_2}${((COUNT_2 / SAMPLED_VALUES) * 100).toFixed(1)}%`
    );
  });

  it('should override the top value bar props with overrideFieldTopValueBar', async () => {
    const SAMPLED_VALUES = 23;
    const VALUE_1 = 12;
    const VALUE_2 = 13;
    const COUNT_1 = 17;
    const COUNT_2 = 6;

    let resolveFunction!: (value: FieldStatsResponse<string | number>) => void;

    mockedLoadFieldStats.mockImplementation(() => {
      return new Promise((resolve) => {
        resolveFunction = resolve;
      });
    });

    const FIELD = dataView.fields.find((f) => f.name === 'machine.ram')!;

    renderWithI18n(
      <FieldStats
        {...defaultProps}
        field={FIELD}
        query={{ language: 'kuery', query: '' }}
        filters={[]}
        fromDate="now-1h"
        toDate="now"
        color={'red'}
        overrideFieldTopValueBar={(params) => ({ color: 'accent' })}
      />
    );

    expect(screen.getByTestId('testing-statsLoading')).toBeVisible();

    act(() => {
      resolveFunction!({
        totalDocuments: 100,
        sampledDocuments: 23,
        sampledValues: SAMPLED_VALUES,
        histogram: {
          buckets: [
            {
              count: COUNT_1,
              key: VALUE_1,
            },
            {
              count: COUNT_2,
              key: VALUE_2,
            },
          ],
        },
        topValues: {
          buckets: [
            {
              count: COUNT_1,
              key: VALUE_1,
            },
            {
              count: COUNT_2,
              key: VALUE_2,
            },
          ],
        },
      });
    });

    expect(await screen.findByTestId('testing-statsLoading')).not.toBeInTheDocument();

    expect(mockedLoadFieldStats).toHaveBeenCalledTimes(1);

    expect(screen.getAllByRole('progressbar')[0].className).toMatch(/accent/);
  });

  it('should render a number summary for some fields (time series metric counter)', async () => {
    const MIN_VALUE = 29674;
    const MAX_VALUE = 36821994;
    let resolveFunction!: (value: FieldStatsResponse<string | number>) => void;

    mockedLoadFieldStats.mockImplementation(() => {
      return new Promise((resolve) => {
        resolveFunction = resolve;
      });
    });

    const FIELD = dataView.fields.find((f) => f.name === 'bytes_counter')!;

    renderWithI18n(
      <FieldStats
        {...defaultProps}
        field={FIELD}
        query={{ language: 'kuery', query: '' }}
        filters={[]}
        fromDate="now-1h"
        toDate="now"
      />
    );

    expect(mockedLoadFieldStats).toHaveBeenCalledWith({
      abortController: new AbortController(),
      services: { data: mockedServices.data },
      dataView,
      fromDate: 'now-1h',
      toDate: 'now',
      dslQuery: {
        bool: {
          must: [],
          filter: [],
          should: [],
          must_not: [],
        },
      },
      field: FIELD,
    });

    expect(screen.getByTestId('testing-statsLoading')).toBeVisible();

    act(() => {
      resolveFunction!({
        numberSummary: {
          maxValue: MAX_VALUE,
          minValue: MIN_VALUE,
        },
        sampledDocuments: 5000,
        sampledValues: 5000,
        totalDocuments: 6460,
      });
    });

    expect(await screen.findByTestId('testing-statsLoading')).not.toBeInTheDocument();

    expect(mockedLoadFieldStats).toHaveBeenCalledTimes(1);

    expect(screen.getByText('Summary')).toBeVisible();

    const table = screen.getByTestId('testing-numberSummary');
    const minRow = within(table).getByText('min').closest('tr')!;
    expect(within(minRow).getByText(String(MIN_VALUE))).toBeVisible();

    const maxRow = within(table).getByText('max').closest('tr')!;
    expect(within(maxRow).getByText(String(MAX_VALUE))).toBeVisible();

    expect(screen.getByTestId('testing-statsFooter')).toHaveTextContent(
      `Calculated from 5000 sample records.`
    );
  });

  it('should not request field stats for ES|QL query', async () => {
    renderWithI18n(<FieldStats {...defaultProps} query={{ esql: 'from logs* | limit 10' }} />);

    expect(mockedLoadFieldStats).toHaveBeenCalledTimes(0);

    expect(screen.getByText('Analysis is not available for this field.')).toBeVisible();
  });
});
