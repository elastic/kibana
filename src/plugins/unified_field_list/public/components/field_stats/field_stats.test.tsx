/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { EuiLoadingSpinner } from '@elastic/eui';
import { coreMock } from '@kbn/core/public/mocks';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { fieldFormatsServiceMock } from '@kbn/field-formats-plugin/public/mocks';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { DataViewField } from '@kbn/data-views-plugin/common';
import { loadFieldStats } from '../../services';
import { FieldStats, FieldStatsProps } from './field_stats';

jest.mock('../../services/field_stats', () => ({
  loadFieldStats: jest.fn().mockResolvedValue({}),
}));

const mockedServices = {
  data: dataPluginMock.createStartContract(),
  dataViews: dataViewPluginMocks.createStartContract(),
  fieldFormats: fieldFormatsServiceMock.createStartContract(),
  charts: chartPluginMock.createSetupContract(),
  uiSettings: coreMock.createStart().uiSettings,
};

const FieldStatsWrapper: React.FC<FieldStatsProps> = (props) => {
  return (
    <KibanaContextProvider services={mockedServices}>
      <FieldStats {...props} />
    </KibanaContextProvider>
  );
};

describe('UnifiedFieldList <FieldStats />', () => {
  let defaultProps: FieldStatsProps;
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
      ],
      getFormatterForField: jest.fn(() => ({
        convert: jest.fn((s: unknown) => JSON.stringify(s)),
      })),
    } as unknown as DataView;

    defaultProps = {
      dataViewOrDataViewId: dataView,
      field: {
        name: 'bytes',
        type: 'number',
      } as unknown as DataViewField,
      fromDate: 'now-7d',
      toDate: 'now',
      query: { query: '', language: 'lucene' },
      filters: [],
      testSubject: 'testing',
    };

    (mockedServices.dataViews.get as jest.Mock).mockImplementation(() => {
      return Promise.resolve(dataView);
    });
  });

  it('should request field stats with correct params', async () => {
    let resolveFunction: (arg: unknown) => void;

    (loadFieldStats as jest.Mock).mockImplementation(() => {
      return new Promise((resolve) => {
        resolveFunction = resolve;
      });
    });

    const wrapper = mountWithIntl(
      <FieldStatsWrapper
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

    await wrapper.update();

    expect(loadFieldStats).toHaveBeenCalledWith({
      abortController: new AbortController(),
      data: mockedServices.data,
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

    expect(wrapper.find(EuiLoadingSpinner)).toHaveLength(1);

    await act(async () => {
      resolveFunction!({
        totalDocuments: 4633,
        sampledDocuments: 4633,
        sampledValues: 4633,
        histogram: {
          buckets: [{ count: 705, key: 0 }],
        },
        topValues: {
          buckets: [{ count: 147, key: 0 }],
        },
      });
    });

    await wrapper.update();

    expect(wrapper.find(EuiLoadingSpinner)).toHaveLength(0);

    expect(loadFieldStats).toHaveBeenCalledTimes(1);

    (loadFieldStats as jest.Mock).mockReset();
    (loadFieldStats as jest.Mock).mockImplementation(() => Promise.resolve({}));
  });

  it('should not request field stats for range fields', async () => {
    mountWithIntl(
      <FieldStatsWrapper
        {...defaultProps}
        field={
          {
            name: 'ip_range',
            displayName: 'ip_range',
            type: 'ip_range',
          } as DataViewField
        }
      />
    );

    expect(loadFieldStats).not.toHaveBeenCalled();
  });
});
