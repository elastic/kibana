/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BehaviorSubject } from 'rxjs';
import { ReactWrapper } from 'enzyme';
import { findTestSubject } from '@elastic/eui/lib/test';
import { EuiProgress } from '@elastic/eui';
import { getDataTableRecords, realHits } from '../../../../__fixtures__/real_hits';
import { act } from 'react-dom/test-utils';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import React from 'react';
import {
  DiscoverSidebarResponsive,
  DiscoverSidebarResponsiveProps,
} from './discover_sidebar_responsive';
import { DiscoverServices } from '../../../../build_services';
import { FetchStatus } from '../../../types';
import {
  AvailableFields$,
  DataDocuments$,
  RecordRawType,
} from '../../services/discover_data_state_container';
import { stubLogstashDataView } from '@kbn/data-plugin/common/stubs';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { getDiscoverStateMock } from '../../../../__mocks__/discover_state.mock';
import { DiscoverAppStateProvider } from '../../services/discover_app_state_container';
import { VIEW_MODE } from '../../../../../common/constants';
import * as ExistingFieldsServiceApi from '@kbn/unified-field-list-plugin/public/services/field_existing/load_field_existing';
import { resetExistingFieldsCache } from '@kbn/unified-field-list-plugin/public/hooks/use_existing_fields';
import { createDiscoverServicesMock } from '../../../../__mocks__/services';
import type { AggregateQuery, Query } from '@kbn/es-query';
import { buildDataTableRecord } from '../../../../utils/build_data_record';
import { type DataTableRecord } from '../../../../types';

jest.mock('@kbn/unified-field-list-plugin/public/services/field_stats', () => ({
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
        {
          count: 1206,
          key: 'zip',
        },
        {
          count: 329,
          key: 'css',
        },
        {
          count: 164,
          key: 'js',
        },
        {
          count: 111,
          key: 'png',
        },
        {
          count: 89,
          key: 'jpg',
        },
      ],
    },
  }),
}));

function createMockServices() {
  const mockServices = {
    ...createDiscoverServicesMock(),
    capabilities: {
      visualize: {
        show: true,
      },
      discover: {
        save: false,
      },
      getState: () => ({
        query: { query: '', language: 'lucene' },
        filters: [],
      }),
    },
    docLinks: { links: { discover: { fieldTypeHelp: '' } } },
    dataViewEditor: {
      userPermissions: {
        editDataView: jest.fn(() => true),
      },
    },
  } as unknown as DiscoverServices;
  return mockServices;
}

const mockfieldCounts: Record<string, number> = {};
const mockCalcFieldCounts = jest.fn(() => {
  return mockfieldCounts;
});

jest.mock('../../../../kibana_services', () => ({
  getUiActions: jest.fn(() => {
    return {
      getTriggerCompatibleActions: jest.fn(() => []),
    };
  }),
}));

jest.mock('../../utils/calc_field_counts', () => ({
  calcFieldCounts: () => mockCalcFieldCounts(),
}));

jest.spyOn(ExistingFieldsServiceApi, 'loadFieldExisting');

function getCompProps(options?: { hits?: DataTableRecord[] }): DiscoverSidebarResponsiveProps {
  const dataView = stubLogstashDataView;
  dataView.toSpec = jest.fn(() => ({}));

  const hits = options?.hits ?? getDataTableRecords(dataView);

  for (const hit of hits) {
    for (const key of Object.keys(hit.flattened)) {
      mockfieldCounts[key] = (mockfieldCounts[key] || 0) + 1;
    }
  }

  return {
    columns: ['extension'],
    documents$: new BehaviorSubject({
      fetchStatus: FetchStatus.COMPLETE,
      result: hits,
    }) as DataDocuments$,
    availableFields$: new BehaviorSubject({
      fetchStatus: FetchStatus.COMPLETE,
      fields: [] as string[],
    }) as AvailableFields$,
    onChangeDataView: jest.fn(),
    onAddFilter: jest.fn(),
    onAddField: jest.fn(),
    onRemoveField: jest.fn(),
    selectedDataView: dataView,
    trackUiMetric: jest.fn(),
    onFieldEdited: jest.fn(),
    viewMode: VIEW_MODE.DOCUMENT_LEVEL,
    onDataViewCreated: jest.fn(),
    useNewFieldsApi: true,
  };
}

function getAppStateContainer({ query }: { query?: Query | AggregateQuery }) {
  const appStateContainer = getDiscoverStateMock({ isTimeBased: true }).appState;
  appStateContainer.set({
    query: query ?? { query: '', language: 'lucene' },
    filters: [],
  });
  return appStateContainer;
}

async function mountComponent(
  props: DiscoverSidebarResponsiveProps,
  appStateParams: { query?: Query | AggregateQuery } = {},
  services?: DiscoverServices
): Promise<ReactWrapper<DiscoverSidebarResponsiveProps>> {
  let comp: ReactWrapper<DiscoverSidebarResponsiveProps>;
  const mockedServices = services ?? createMockServices();
  mockedServices.data.dataViews.getIdsWithTitle = jest.fn(async () =>
    props.selectedDataView
      ? [{ id: props.selectedDataView.id!, title: props.selectedDataView.title! }]
      : []
  );
  mockedServices.data.dataViews.get = jest.fn().mockImplementation(async (id) => {
    return [props.selectedDataView].find((d) => d!.id === id);
  });

  await act(async () => {
    comp = await mountWithIntl(
      <KibanaContextProvider services={mockedServices}>
        <DiscoverAppStateProvider value={getAppStateContainer(appStateParams)}>
          <DiscoverSidebarResponsive {...props} />
        </DiscoverAppStateProvider>
      </KibanaContextProvider>
    );
    // wait for lazy modules
    await new Promise((resolve) => setTimeout(resolve, 0));
    await comp.update();
  });

  await comp!.update();

  return comp!;
}

describe('discover responsive sidebar', function () {
  let props: DiscoverSidebarResponsiveProps;

  beforeEach(async () => {
    (ExistingFieldsServiceApi.loadFieldExisting as jest.Mock).mockImplementation(async () => ({
      indexPatternTitle: 'test',
      existingFieldNames: Object.keys(mockfieldCounts),
    }));
    props = getCompProps();
  });

  afterEach(() => {
    mockCalcFieldCounts.mockClear();
    (ExistingFieldsServiceApi.loadFieldExisting as jest.Mock).mockClear();
    resetExistingFieldsCache();
  });

  it('should have loading indicators during fields existence loading', async function () {
    let resolveFunction: (arg: unknown) => void;
    (ExistingFieldsServiceApi.loadFieldExisting as jest.Mock).mockReset();
    (ExistingFieldsServiceApi.loadFieldExisting as jest.Mock).mockImplementation(() => {
      return new Promise((resolve) => {
        resolveFunction = resolve;
      });
    });

    const compLoadingExistence = await mountComponent(props);

    expect(
      findTestSubject(compLoadingExistence, 'fieldListGroupedAvailableFields-countLoading').exists()
    ).toBe(true);
    expect(
      findTestSubject(compLoadingExistence, 'fieldListGroupedAvailableFields-count').exists()
    ).toBe(false);

    expect(compLoadingExistence.find(EuiProgress).exists()).toBe(true);

    await act(async () => {
      const appStateContainer = getDiscoverStateMock({ isTimeBased: true }).appState;
      appStateContainer.set({
        query: { query: '', language: 'lucene' },
        filters: [],
      });
      resolveFunction!({
        indexPatternTitle: 'test-loaded',
        existingFieldNames: Object.keys(mockfieldCounts),
      });
      await compLoadingExistence.update();
    });

    await act(async () => {
      await compLoadingExistence.update();
    });

    expect(
      findTestSubject(compLoadingExistence, 'fieldListGroupedAvailableFields-countLoading').exists()
    ).toBe(false);
    expect(
      findTestSubject(compLoadingExistence, 'fieldListGroupedAvailableFields-count').exists()
    ).toBe(true);

    expect(compLoadingExistence.find(EuiProgress).exists()).toBe(false);

    expect(ExistingFieldsServiceApi.loadFieldExisting).toHaveBeenCalledTimes(1);
  });

  it('should have Selected Fields, Available Fields, Popular and Meta Fields sections', async function () {
    const comp = await mountComponent(props);
    const popularFieldsCount = findTestSubject(comp, 'fieldListGroupedPopularFields-count');
    const selectedFieldsCount = findTestSubject(comp, 'fieldListGroupedSelectedFields-count');
    const availableFieldsCount = findTestSubject(comp, 'fieldListGroupedAvailableFields-count');
    const emptyFieldsCount = findTestSubject(comp, 'fieldListGroupedEmptyFields-count');
    const metaFieldsCount = findTestSubject(comp, 'fieldListGroupedMetaFields-count');
    const unmappedFieldsCount = findTestSubject(comp, 'fieldListGroupedUnmappedFields-count');

    expect(selectedFieldsCount.text()).toBe('1');
    expect(popularFieldsCount.text()).toBe('4');
    expect(availableFieldsCount.text()).toBe('3');
    expect(emptyFieldsCount.text()).toBe('20');
    expect(metaFieldsCount.text()).toBe('2');
    expect(unmappedFieldsCount.exists()).toBe(false);
    expect(mockCalcFieldCounts.mock.calls.length).toBe(1);

    expect(props.availableFields$.getValue()).toEqual({
      fetchStatus: 'complete',
      fields: ['extension'],
    });

    expect(findTestSubject(comp, 'fieldListGrouped__ariaDescription').text()).toBe(
      '1 selected field. 4 popular fields. 3 available fields. 20 empty fields. 2 meta fields.'
    );

    expect(ExistingFieldsServiceApi.loadFieldExisting).toHaveBeenCalledTimes(1);
  });

  it('should not have selected fields if no columns selected', async function () {
    const propsWithoutColumns = {
      ...props,
      columns: [],
    };
    const compWithoutSelected = await mountComponent(propsWithoutColumns);
    const popularFieldsCount = findTestSubject(
      compWithoutSelected,
      'fieldListGroupedPopularFields-count'
    );
    const selectedFieldsCount = findTestSubject(
      compWithoutSelected,
      'fieldListGroupedSelectedFields-count'
    );
    const availableFieldsCount = findTestSubject(
      compWithoutSelected,
      'fieldListGroupedAvailableFields-count'
    );
    const emptyFieldsCount = findTestSubject(
      compWithoutSelected,
      'fieldListGroupedEmptyFields-count'
    );
    const metaFieldsCount = findTestSubject(
      compWithoutSelected,
      'fieldListGroupedMetaFields-count'
    );
    const unmappedFieldsCount = findTestSubject(
      compWithoutSelected,
      'fieldListGroupedUnmappedFields-count'
    );

    expect(selectedFieldsCount.exists()).toBe(false);
    expect(popularFieldsCount.text()).toBe('4');
    expect(availableFieldsCount.text()).toBe('3');
    expect(emptyFieldsCount.text()).toBe('20');
    expect(metaFieldsCount.text()).toBe('2');
    expect(unmappedFieldsCount.exists()).toBe(false);

    expect(propsWithoutColumns.availableFields$.getValue()).toEqual({
      fetchStatus: 'complete',
      fields: ['bytes', 'extension', '_id', 'phpmemory'],
    });

    expect(findTestSubject(compWithoutSelected, 'fieldListGrouped__ariaDescription').text()).toBe(
      '4 popular fields. 3 available fields. 20 empty fields. 2 meta fields.'
    );
  });

  it('should not calculate counts if documents are not fetched yet', async function () {
    const propsWithoutDocuments: DiscoverSidebarResponsiveProps = {
      ...props,
      documents$: new BehaviorSubject({
        fetchStatus: FetchStatus.UNINITIALIZED,
        result: undefined,
      }) as DataDocuments$,
    };
    const compWithoutDocuments = await mountComponent(propsWithoutDocuments);
    const availableFieldsCount = findTestSubject(
      compWithoutDocuments,
      'fieldListGroupedAvailableFields-count'
    );

    expect(availableFieldsCount.exists()).toBe(false);

    expect(mockCalcFieldCounts.mock.calls.length).toBe(0);
    expect(ExistingFieldsServiceApi.loadFieldExisting).not.toHaveBeenCalled();
  });

  it('should allow selecting fields', async function () {
    const comp = await mountComponent(props);
    const availableFields = findTestSubject(comp, 'fieldListGroupedAvailableFields');
    findTestSubject(availableFields, 'fieldToggle-bytes').simulate('click');
    expect(props.onAddField).toHaveBeenCalledWith('bytes');
  });
  it('should allow deselecting fields', async function () {
    const comp = await mountComponent(props);
    const selectedFields = findTestSubject(comp, 'fieldListGroupedSelectedFields');
    findTestSubject(selectedFields, 'fieldToggle-extension').simulate('click');
    expect(props.onRemoveField).toHaveBeenCalledWith('extension');
  });
  it('should allow adding filters', async function () {
    const comp = await mountComponent(props);
    const availableFields = findTestSubject(comp, 'fieldListGroupedAvailableFields');
    await act(async () => {
      const button = findTestSubject(availableFields, 'field-extension-showDetails');
      await button.simulate('click');
      await comp.update();
    });

    await comp.update();
    findTestSubject(comp, 'plus-extension-gif').simulate('click');
    expect(props.onAddFilter).toHaveBeenCalled();
  });
  it('should allow adding "exist" filter', async function () {
    const comp = await mountComponent(props);
    const availableFields = findTestSubject(comp, 'fieldListGroupedAvailableFields');
    await act(async () => {
      const button = findTestSubject(availableFields, 'field-extension-showDetails');
      await button.simulate('click');
      await comp.update();
    });

    await comp.update();
    findTestSubject(comp, 'discoverFieldListPanelAddExistFilter-extension').simulate('click');
    expect(props.onAddFilter).toHaveBeenCalledWith('_exists_', 'extension', '+');
  });
  it('should allow filtering by string, and calcFieldCount should just be executed once', async function () {
    const comp = await mountComponent(props);

    expect(findTestSubject(comp, 'fieldListGroupedAvailableFields-count').text()).toBe('3');
    expect(findTestSubject(comp, 'fieldListGrouped__ariaDescription').text()).toBe(
      '1 selected field. 4 popular fields. 3 available fields. 20 empty fields. 2 meta fields.'
    );

    await act(async () => {
      await findTestSubject(comp, 'fieldFilterSearchInput').simulate('change', {
        target: { value: 'bytes' },
      });
    });

    expect(findTestSubject(comp, 'fieldListGroupedAvailableFields-count').text()).toBe('1');
    expect(findTestSubject(comp, 'fieldListGrouped__ariaDescription').text()).toBe(
      '1 popular field. 1 available field. 0 empty fields. 0 meta fields.'
    );
    expect(mockCalcFieldCounts.mock.calls.length).toBe(1);
  });

  it('should show "Add a field" button to create a runtime field', async () => {
    const services = createMockServices();
    const comp = await mountComponent(props, {}, services);
    expect(services.dataViewEditor.userPermissions.editDataView).toHaveBeenCalled();
    expect(findTestSubject(comp, 'dataView-add-field_btn').length).toBe(1);
  });

  it('should render correctly in the sql mode', async () => {
    const propsWithTextBasedMode = {
      ...props,
      columns: ['extension', 'bytes'],
      onAddFilter: undefined,
      documents$: new BehaviorSubject({
        fetchStatus: FetchStatus.COMPLETE,
        recordRawType: RecordRawType.PLAIN,
        result: getDataTableRecords(stubLogstashDataView),
      }) as DataDocuments$,
    };
    const compInViewerMode = await mountComponent(propsWithTextBasedMode, {
      query: { sql: 'SELECT * FROM `index`' },
    });
    expect(findTestSubject(compInViewerMode, 'indexPattern-add-field_btn').length).toBe(0);

    const popularFieldsCount = findTestSubject(
      compInViewerMode,
      'fieldListGroupedPopularFields-count'
    );
    const selectedFieldsCount = findTestSubject(
      compInViewerMode,
      'fieldListGroupedSelectedFields-count'
    );
    const availableFieldsCount = findTestSubject(
      compInViewerMode,
      'fieldListGroupedAvailableFields-count'
    );
    const emptyFieldsCount = findTestSubject(compInViewerMode, 'fieldListGroupedEmptyFields-count');
    const metaFieldsCount = findTestSubject(compInViewerMode, 'fieldListGroupedMetaFields-count');
    const unmappedFieldsCount = findTestSubject(
      compInViewerMode,
      'fieldListGroupedUnmappedFields-count'
    );

    expect(selectedFieldsCount.text()).toBe('2');
    expect(popularFieldsCount.exists()).toBe(false);
    expect(availableFieldsCount.text()).toBe('4');
    expect(emptyFieldsCount.exists()).toBe(false);
    expect(metaFieldsCount.exists()).toBe(false);
    expect(unmappedFieldsCount.exists()).toBe(false);

    expect(mockCalcFieldCounts.mock.calls.length).toBe(1);

    expect(findTestSubject(compInViewerMode, 'fieldListGrouped__ariaDescription').text()).toBe(
      '2 selected fields. 4 available fields.'
    );
  });

  it('should render correctly unmapped fields', async () => {
    const propsWithUnmappedField = getCompProps({
      hits: [
        buildDataTableRecord(realHits[0], stubLogstashDataView),
        buildDataTableRecord(
          {
            _index: 'logstash-2014.09.09',
            _id: '1945',
            _score: 1,
            _source: {
              extension: 'gif',
              bytes: 10617.2,
              test_unmapped: 'show me too',
            },
          },
          stubLogstashDataView
        ),
      ],
    });
    const compWithUnmapped = await mountComponent(propsWithUnmappedField);

    expect(findTestSubject(compWithUnmapped, 'fieldListGrouped__ariaDescription').text()).toBe(
      '1 selected field. 4 popular fields. 3 available fields. 1 unmapped field. 20 empty fields. 2 meta fields.'
    );
  });

  it('should not show "Add a field" button in viewer mode', async () => {
    const services = createMockServices();
    services.dataViewEditor.userPermissions.editDataView = jest.fn(() => false);
    const compInViewerMode = await mountComponent(props, {}, services);
    expect(services.dataViewEditor.userPermissions.editDataView).toHaveBeenCalled();
    expect(findTestSubject(compInViewerMode, 'dataView-add-field_btn').length).toBe(0);
  });
});
