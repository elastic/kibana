/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { ReactWrapper } from 'enzyme';
import { EuiLoadingSpinner, EuiProgress } from '@elastic/eui';
import { coreMock } from '@kbn/core/public/mocks';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { fieldFormatsServiceMock } from '@kbn/field-formats-plugin/public/mocks';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { DataViewField } from '@kbn/data-views-plugin/common';
import { loadFieldStats } from '../../services/field_stats';
import FieldStats, { FieldStatsWithKbnQuery } from './field_stats';

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

describe('UnifiedFieldList <FieldStats />', () => {
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

    (mockedServices.dataViews.get as jest.Mock).mockImplementation(() => {
      return Promise.resolve(dataView);
    });
  });

  async function mountComponent(component: React.ReactElement): Promise<ReactWrapper> {
    let wrapper: ReactWrapper;
    await act(async () => {
      wrapper = await mountWithIntl(component);
      // wait for lazy modules if any
      await new Promise((resolve) => setTimeout(resolve, 0));
      await wrapper.update();
    });

    return wrapper!;
  }

  beforeEach(() => {
    (loadFieldStats as jest.Mock).mockReset();
    (loadFieldStats as jest.Mock).mockImplementation(() => Promise.resolve({}));
  });

  it('should request field stats with correct params', async () => {
    let resolveFunction: (arg: unknown) => void;

    (loadFieldStats as jest.Mock).mockImplementation(() => {
      return new Promise((resolve) => {
        resolveFunction = resolve;
      });
    });

    const wrapper = await mountComponent(
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

    expect(loadFieldStats).toHaveBeenCalledWith({
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
  });

  it('should request field stats with dsl query', async () => {
    let resolveFunction: (arg: unknown) => void;

    (loadFieldStats as jest.Mock).mockImplementation(() => {
      return new Promise((resolve) => {
        resolveFunction = resolve;
      });
    });

    const wrapper = mountWithIntl(
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

    await wrapper.update();

    expect(loadFieldStats).toHaveBeenCalledWith({
      abortController: new AbortController(),
      services: { data: mockedServices.data },
      dataView,
      dslQuery: { bool: { filter: { range: { field: 'duration', gte: 3000 } } } },
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
  });

  it('should not request field stats for range fields', async () => {
    const wrapper = await mountComponent(
      <FieldStats {...defaultProps} field={dataView.fields.find((f) => f.name === 'ip_range')!} />
    );

    expect(loadFieldStats).toHaveBeenCalled();

    expect(wrapper.text()).toBe('Analysis is not available for this field.');
  });

  it('should request field examples for geo fields', async () => {
    const wrapper = await mountComponent(
      <FieldStats {...defaultProps} field={dataView.fields.find((f) => f.name === 'geo_shape')!} />
    );

    expect(loadFieldStats).toHaveBeenCalled();

    expect(wrapper.text()).toBe('No field data for the current search.');
  });

  it('should render a message if no data is found', async () => {
    const wrapper = await mountComponent(<FieldStats {...defaultProps} />);

    expect(loadFieldStats).toHaveBeenCalled();

    expect(wrapper.text()).toBe('No field data for the current search.');
  });

  it('should render a message if no data is found in sample', async () => {
    let resolveFunction: (arg: unknown) => void;

    (loadFieldStats as jest.Mock).mockImplementation(() => {
      return new Promise((resolve) => {
        resolveFunction = resolve;
      });
    });

    const wrapper = await mountComponent(<FieldStats {...defaultProps} />);

    await act(async () => {
      resolveFunction!({
        totalDocuments: 10000,
        sampledDocuments: 5000,
        sampledValues: 0,
      });
    });

    await wrapper.update();

    expect(loadFieldStats).toHaveBeenCalledTimes(1);

    expect(wrapper.text()).toBe('No field data for 5000 sample records.');
  });

  it('should render Top Values field stats correctly for a keyword field', async () => {
    let resolveFunction: (arg: unknown) => void;

    (loadFieldStats as jest.Mock).mockImplementation(() => {
      return new Promise((resolve) => {
        resolveFunction = resolve;
      });
    });

    const wrapper = await mountComponent(
      <FieldStats
        {...defaultProps}
        query={{ language: 'kuery', query: '' }}
        filters={[]}
        fromDate="now-7d"
        toDate="now"
      />
    );

    expect(loadFieldStats).toHaveBeenCalledWith({
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

    expect(wrapper.find(EuiLoadingSpinner)).toHaveLength(1);

    await act(async () => {
      resolveFunction!({
        totalDocuments: 1624,
        sampledDocuments: 1624,
        sampledValues: 3248,
        topValues: {
          buckets: [
            {
              count: 1349,
              key: 'success',
            },
            {
              count: 1206,
              key: 'info',
            },
            {
              count: 329,
              key: 'security',
            },
            {
              count: 164,
              key: 'warning',
            },
            {
              count: 111,
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

    await wrapper.update();

    expect(wrapper.find(EuiLoadingSpinner)).toHaveLength(0);
    expect(wrapper.find(EuiProgress)).toHaveLength(6);

    expect(loadFieldStats).toHaveBeenCalledTimes(1);

    const stats = wrapper.find('[data-test-subj="testing-topValues"]');
    const firstValue = stats.childAt(0);

    expect(stats).toHaveLength(1);
    expect(
      firstValue.find('[data-test-subj="testing-topValues-formattedFieldValue"]').first().text()
    ).toBe('"success"');
    expect(
      firstValue.find('[data-test-subj="testing-topValues-formattedPercentage"]').first().text()
    ).toBe('41.5%');

    expect(wrapper.find('[data-test-subj="testing-statsFooter"]').first().text()).toBe(
      'Calculated from 1624 records.'
    );

    expect(wrapper.text()).toBe(
      'Top values"success"41.5%"info"37.1%"security"10.1%"warning"5.0%"error"3.4%"login"2.7%Calculated from 1624 records.'
    );
  });

  it('should render Examples correctly for a non-aggregatable field', async () => {
    let resolveFunction: (arg: unknown) => void;

    (loadFieldStats as jest.Mock).mockImplementation(() => {
      return new Promise((resolve) => {
        resolveFunction = resolve;
      });
    });

    const wrapper = await mountComponent(
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

    expect(wrapper.find(EuiLoadingSpinner)).toHaveLength(1);

    await act(async () => {
      resolveFunction!({
        totalDocuments: 1624,
        sampledDocuments: 1624,
        sampledValues: 3248,
        topValues: {
          buckets: [
            {
              count: 1349,
              key: 'success',
            },
            {
              count: 1206,
              key: 'info',
            },
            {
              count: 329,
              key: 'security',
            },
            {
              count: 164,
              key: 'warning',
            },
            {
              count: 111,
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

    await wrapper.update();

    expect(wrapper.find(EuiLoadingSpinner)).toHaveLength(0);
    expect(wrapper.find(EuiProgress)).toHaveLength(6);

    expect(loadFieldStats).toHaveBeenCalledTimes(1);

    expect(wrapper.text()).toBe(
      'Examples"success"41.5%"info"37.1%"security"10.1%"warning"5.0%"error"3.4%"login"2.7%Calculated from 1624 records.'
    );
  });

  it('should render Histogram field stats correctly for a date field', async () => {
    let resolveFunction: (arg: unknown) => void;

    (loadFieldStats as jest.Mock).mockImplementation(() => {
      return new Promise((resolve) => {
        resolveFunction = resolve;
      });
    });

    const wrapper = await mountComponent(
      <FieldStats
        {...defaultProps}
        field={dataView.fields[0]}
        query={{ language: 'kuery', query: '' }}
        filters={[]}
        fromDate="now-1h"
        toDate="now"
      />
    );

    expect(loadFieldStats).toHaveBeenCalledWith({
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

    expect(wrapper.find(EuiLoadingSpinner)).toHaveLength(1);

    await act(async () => {
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

    await wrapper.update();

    expect(wrapper.find(EuiLoadingSpinner)).toHaveLength(0);

    expect(loadFieldStats).toHaveBeenCalledTimes(1);

    expect(wrapper.find('[data-test-subj="testing-topValues"]')).toHaveLength(0);
    expect(wrapper.find('[data-test-subj="testing-histogram"]')).toHaveLength(1);
    expect(wrapper.find('[data-test-subj="testing-statsFooter"]').first().text()).toBe(
      'Calculated from 13 records.'
    );

    expect(wrapper.text()).toBe('Time distributionCalculated from 13 records.');
  });

  it('should render Top Values & Distribution field stats correctly for a number field', async () => {
    let resolveFunction: (arg: unknown) => void;

    (loadFieldStats as jest.Mock).mockImplementation(() => {
      return new Promise((resolve) => {
        resolveFunction = resolve;
      });
    });

    const field = dataView.fields.find((f) => f.name === 'machine.ram')!;

    const wrapper = await mountComponent(
      <FieldStats
        {...defaultProps}
        field={field}
        query={{ language: 'kuery', query: '' }}
        filters={[]}
        fromDate="now-1h"
        toDate="now"
      />
    );

    expect(loadFieldStats).toHaveBeenCalledWith({
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
      field,
    });

    expect(wrapper.find(EuiLoadingSpinner)).toHaveLength(1);

    await act(async () => {
      resolveFunction!({
        totalDocuments: 100,
        sampledDocuments: 23,
        sampledValues: 23,
        histogram: {
          buckets: [
            {
              count: 17,
              key: 12,
            },
            {
              count: 6,
              key: 13,
            },
          ],
        },
        topValues: {
          buckets: [
            {
              count: 17,
              key: 12,
            },
            {
              count: 6,
              key: 13,
            },
          ],
        },
      });
    });

    await wrapper.update();

    expect(wrapper.find(EuiLoadingSpinner)).toHaveLength(0);

    expect(loadFieldStats).toHaveBeenCalledTimes(1);

    expect(wrapper.text()).toBe(
      'Toggle either theTop valuesDistribution1273.9%1326.1%Calculated from 23 sample records.'
    );
  });

  it('should override the top value bar props with overrideFieldTopValueBar', async () => {
    let resolveFunction: (arg: unknown) => void;

    (loadFieldStats as jest.Mock).mockImplementation(() => {
      return new Promise((resolve) => {
        resolveFunction = resolve;
      });
    });

    const field = dataView.fields.find((f) => f.name === 'machine.ram')!;

    const wrapper = mountWithIntl(
      <FieldStats
        {...defaultProps}
        field={field}
        query={{ language: 'kuery', query: '' }}
        filters={[]}
        fromDate="now-1h"
        toDate="now"
        color={'red'}
        overrideFieldTopValueBar={(params) => ({ color: 'accent' })}
      />
    );

    await wrapper.update();

    expect(wrapper.find(EuiLoadingSpinner)).toHaveLength(1);

    await act(async () => {
      resolveFunction!({
        totalDocuments: 100,
        sampledDocuments: 23,
        sampledValues: 23,
        histogram: {
          buckets: [
            {
              count: 17,
              key: 12,
            },
            {
              count: 6,
              key: 13,
            },
          ],
        },
        topValues: {
          buckets: [
            {
              count: 17,
              key: 12,
            },
            {
              count: 6,
              key: 13,
            },
          ],
        },
      });
    });

    await wrapper.update();

    expect(wrapper.find(EuiLoadingSpinner)).toHaveLength(0);

    expect(loadFieldStats).toHaveBeenCalledTimes(1);

    expect(wrapper.find(EuiProgress)).toHaveLength(2);
    expect(wrapper.find(EuiProgress).first().props()).toHaveProperty('color', 'accent');
  });
});
