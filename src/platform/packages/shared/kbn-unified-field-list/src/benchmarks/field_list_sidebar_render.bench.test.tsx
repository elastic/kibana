/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiThemeProvider } from '@elastic/eui';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent, { PointerEventsCheckLevel } from '@testing-library/user-event';
import { createStubDataView } from '@kbn/data-views-plugin/common/data_view.stub';
import type { FieldSpec } from '@kbn/data-views-plugin/common';
import { FIELDS_LIMIT_SETTING } from '@kbn/discover-utils';
import { getServicesMock } from '../../__mocks__/services.mock';
import UnifiedFieldListSidebarContainer from '../containers/unified_field_list_sidebar/field_list_sidebar_container';
import { resetExistingFieldsCache } from '../hooks/use_existing_fields';
import { ExistenceFetchStatus } from '../types';

jest.mock('../services/field_stats', () => ({
  loadFieldStats: jest.fn().mockResolvedValue({
    totalDocuments: 1624,
    sampledDocuments: 1624,
    sampledValues: 3248,
    topValues: {
      buckets: [
        {
          count: 1349,
          key: 'gif',
        },
      ],
    },
  }),
}));

const ITERATIONS = 8;
const PARENT_FIELD_COUNT = 90;
const MULTI_FIELDS_PER_PARENT = 2;

const getCreationOptions = () => ({
  originatingApp: 'unifiedFieldListBenchmark',
  localStorageKeyPrefix: 'unifiedFieldListBenchmark',
  compressed: true,
  disablePopularFields: true,
});

const average = (values: number[]) =>
  values.reduce((sum, currentValue) => sum + currentValue, 0) / values.length;

const getDataViewHash = (dataView: ReturnType<typeof createBenchmarkDataView>) =>
  `${dataView.id}:${dataView.title}:${dataView.timeFieldName || 'no-timefield'}:${Boolean(
    dataView.getAggregationRestrictions?.()
  )}:${dataView.fields.length}`;

const createBenchmarkDataView = () => {
  const fields: Record<string, FieldSpec> = {
    '@timestamp': {
      name: '@timestamp',
      type: 'date',
      esTypes: ['date'],
      aggregatable: true,
      searchable: true,
      readFromDocValues: true,
      scripted: false,
      count: 0,
    },
    _id: {
      name: '_id',
      type: 'string',
      esTypes: ['_id'],
      aggregatable: false,
      searchable: true,
      readFromDocValues: true,
      scripted: false,
      count: 0,
    },
  };

  for (let parentFieldIndex = 0; parentFieldIndex < PARENT_FIELD_COUNT; parentFieldIndex++) {
    const parentFieldName = `field_${parentFieldIndex}`;

    fields[parentFieldName] = {
      name: parentFieldName,
      type: 'string',
      esTypes: ['text'],
      aggregatable: false,
      searchable: true,
      readFromDocValues: false,
      scripted: false,
      count: PARENT_FIELD_COUNT - parentFieldIndex,
    };

    for (let multiFieldIndex = 0; multiFieldIndex < MULTI_FIELDS_PER_PARENT; multiFieldIndex++) {
      fields[`${parentFieldName}.keyword_${multiFieldIndex}`] = {
        name: `${parentFieldName}.keyword_${multiFieldIndex}`,
        type: 'string',
        esTypes: ['keyword'],
        aggregatable: true,
        searchable: true,
        readFromDocValues: true,
        scripted: false,
        count: PARENT_FIELD_COUNT - parentFieldIndex,
        subType: {
          multi: {
            parent: parentFieldName,
          },
        },
      };
    }
  }

  return createStubDataView({
    spec: {
      id: 'benchmark-data-view',
      title: 'benchmark-data-view',
      timeFieldName: '@timestamp',
      fields,
    },
  });
};

const renderSidebar = async () => {
  const services = getServicesMock();
  const dataView = createBenchmarkDataView();
  const existingFieldsByFieldNameMap = Object.fromEntries(
    dataView.fields.map((field) => [field.name, true])
  );

  (services.dataViews.get as jest.Mock).mockResolvedValue(dataView);
  (services.core.uiSettings.get as jest.Mock).mockImplementation((key: string) => {
    if (key === FIELDS_LIMIT_SETTING) {
      return 0;
    }

    return undefined;
  });

  const user = userEvent.setup({
    pointerEventsCheck: PointerEventsCheckLevel.Never,
    skipHover: true,
  });

  const renderResult = render(
    <EuiThemeProvider>
      <UnifiedFieldListSidebarContainer
        services={services}
        getCreationOptions={getCreationOptions}
        dataView={dataView}
        allFields={dataView.fields}
        variant="list-always"
        showFieldList={true}
        workspaceSelectedFieldNames={[]}
        initialExistingFieldsInfo={{
          dataViewId: dataView.id!,
          dataViewHash: getDataViewHash(dataView),
          info: {
            fetchStatus: ExistenceFetchStatus.succeeded,
            existingFieldsByFieldNameMap,
            numberOfFetches: 1,
          },
        }}
        onAddFieldToWorkspace={jest.fn()}
        onRemoveFieldFromWorkspace={jest.fn()}
        onAddFilter={jest.fn()}
      />
    </EuiThemeProvider>
  );

  await screen.findByTestId('field-field_0-showDetails');

  return { renderResult, user };
};

describe('UnifiedFieldListSidebar benchmark', () => {
  afterEach(() => {
    cleanup();
    resetExistingFieldsCache();
    window.localStorage.clear();
  });

  it('measures render and field-open costs for a dense field list', async () => {
    const initialRenderDurations: number[] = [];
    const initialDomNodeCounts: number[] = [];
    const openFieldDurations: number[] = [];
    const openFieldDomNodeCounts: number[] = [];

    for (let iteration = 0; iteration < ITERATIONS; iteration++) {
      const renderStart = performance.now();
      const { renderResult, user } = await renderSidebar();
      initialRenderDurations.push(performance.now() - renderStart);
      initialDomNodeCounts.push(renderResult.container.querySelectorAll('*').length);

      const openStart = performance.now();
      await user.click(screen.getByTestId('field-field_0-showDetails'));
      await screen.findByTestId('fieldPopoverHeader_addField-field_0');
      openFieldDurations.push(performance.now() - openStart);
      openFieldDomNodeCounts.push(document.body.querySelectorAll('*').length);

      renderResult.unmount();
      cleanup();
      resetExistingFieldsCache();
      window.localStorage.clear();
    }

    const summary = {
      iterations: ITERATIONS,
      parentFieldCount: PARENT_FIELD_COUNT,
      multiFieldsPerParent: MULTI_FIELDS_PER_PARENT,
      avgInitialRenderDurationMs: Number(average(initialRenderDurations).toFixed(2)),
      avgInitialDomNodeCount: Number(average(initialDomNodeCounts).toFixed(2)),
      avgOpenFieldDurationMs: Number(average(openFieldDurations).toFixed(2)),
      avgOpenFieldDomNodeCount: Number(average(openFieldDomNodeCounts).toFixed(2)),
    };

    // eslint-disable-next-line no-console
    console.info('[unified-field-list benchmark]', JSON.stringify(summary));

    expect(summary.avgInitialRenderDurationMs).toBeGreaterThan(0);
    expect(summary.avgInitialDomNodeCount).toBeGreaterThan(0);
    expect(summary.avgOpenFieldDurationMs).toBeGreaterThan(0);
    expect(summary.avgOpenFieldDomNodeCount).toBeGreaterThan(summary.avgInitialDomNodeCount);
  }, 120_000);
});
