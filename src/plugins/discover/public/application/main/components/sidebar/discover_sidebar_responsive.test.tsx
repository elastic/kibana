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
import { getDataTableRecords } from '../../../../__fixtures__/real_hits';
import { act } from 'react-dom/test-utils';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import React from 'react';
import { DataViewListItem } from '@kbn/data-views-plugin/public';
import {
  DiscoverSidebarResponsive,
  DiscoverSidebarResponsiveProps,
} from './discover_sidebar_responsive';
import { DiscoverServices } from '../../../../build_services';
import { FetchStatus } from '../../../types';
import { AvailableFields$, DataDocuments$, RecordRawType } from '../../hooks/use_saved_search';
import { stubLogstashDataView } from '@kbn/data-plugin/common/stubs';
import { VIEW_MODE } from '../../../../components/view_mode_toggle';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { fieldFormatsServiceMock } from '@kbn/field-formats-plugin/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { getDiscoverStateMock } from '../../../../__mocks__/discover_state.mock';
import { DiscoverAppStateProvider } from '../../services/discover_app_state_container';
import * as ExistingFieldsServiceApi from '@kbn/unified-field-list-plugin/public/services/field_existing/load_field_existing';
import { coreMock } from '@kbn/core/public/mocks';

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

const dataServiceMock = dataPluginMock.createStartContract();
const dataViews = dataViewPluginMocks.createStartContract();
const core = coreMock.createStart();

const mockServices = {
  core,
  history: () => ({
    location: {
      search: '',
    },
  }),
  capabilities: {
    visualize: {
      show: true,
    },
    discover: {
      save: false,
    },
  },
  uiSettings: core.uiSettings,
  docLinks: { links: { discover: { fieldTypeHelp: '' } } },
  dataViewEditor: {
    userPermissions: {
      editDataView: jest.fn(() => true),
    },
  },
  data: {
    ...dataServiceMock,
    query: {
      ...dataServiceMock.query,
      timefilter: {
        ...dataServiceMock.query.timefilter,
        timefilter: {
          ...dataServiceMock.query.timefilter.timefilter,
          getAbsoluteTime: () => ({
            from: '2021-08-31T22:00:00.000Z',
            to: '2022-09-01T09:16:29.553Z',
          }),
          getTime: () => ({
            from: 'now-15m',
            to: 'now',
          }),
        },
      },
    },
  },
  dataViews,
  fieldFormats: fieldFormatsServiceMock.createStartContract(),
  charts: chartPluginMock.createSetupContract(),
} as unknown as DiscoverServices;

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

jest.spyOn(ExistingFieldsServiceApi, 'loadFieldExisting').mockImplementation(async () => ({
  indexPatternTitle: 'test',
  existingFieldNames: Object.keys(mockCalcFieldCounts()),
}));
jest.spyOn(dataViews, 'get').mockImplementation(async (dataViewId) => {
  return [stubLogstashDataView].find((dw) => dw.id === dataViewId)!;
});
jest.spyOn(core.uiSettings, 'get').mockImplementation((key: string) => {
  if (key === 'fields:popularLimit') {
    return 5;
  }
});

function getCompProps(): DiscoverSidebarResponsiveProps {
  const dataView = stubLogstashDataView;
  dataView.toSpec = jest.fn(() => ({}));

  const hits = getDataTableRecords(dataView);

  const dataViewList = [
    { id: '0', title: 'b' } as DataViewListItem,
    { id: '1', title: 'a' } as DataViewListItem,
    { id: '2', title: 'c' } as DataViewListItem,
  ];

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
    dataViewList,
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

describe('discover responsive sidebar', function () {
  let props: DiscoverSidebarResponsiveProps;
  let comp: ReactWrapper<DiscoverSidebarResponsiveProps>;

  beforeAll(async () => {
    props = getCompProps();
    await act(async () => {
      const appStateContainer = getDiscoverStateMock({ isTimeBased: true }).appStateContainer;
      appStateContainer.set({
        query: { query: '', language: 'lucene' },
        filters: [],
      });

      comp = await mountWithIntl(
        <KibanaContextProvider services={mockServices}>
          <DiscoverAppStateProvider value={appStateContainer}>
            <DiscoverSidebarResponsive {...props} />
          </DiscoverAppStateProvider>
        </KibanaContextProvider>
      );
      // wait for lazy modules
      await new Promise((resolve) => setTimeout(resolve, 0));
      await comp.update();
    });
  });

  it('should have Selected Fields, Available Fields, and Popular Fields sections', async function () {
    const popularFieldsCount = findTestSubject(comp, 'fieldListGroupedPopularFields-count');
    const selectedFieldsCount = findTestSubject(comp, 'fieldListGroupedSelectedFields-count');
    const availableFieldsCount = findTestSubject(comp, 'fieldListGroupedAvailableFields-count');
    const emptyFieldsCount = findTestSubject(comp, 'fieldListGroupedEmptyFields-count');
    const metaFieldsCount = findTestSubject(comp, 'fieldListGroupedMetaFields-count');

    expect(selectedFieldsCount.text()).toBe('1');
    expect(popularFieldsCount.text()).toBe('1');
    expect(availableFieldsCount.text()).toBe('3'); // TODO: double check
    expect(emptyFieldsCount.text()).toBe('20');
    expect(metaFieldsCount.text()).toBe('2');
    expect(mockCalcFieldCounts.mock.calls.length).toBe(1);
  });
  it('should allow selecting fields', function () {
    const availableFields = findTestSubject(comp, 'fieldListGroupedAvailableFields');
    findTestSubject(availableFields, 'fieldToggle-bytes').simulate('click');
    expect(props.onAddField).toHaveBeenCalledWith('bytes');
  });
  it('should allow deselecting fields', function () {
    const selectedFields = findTestSubject(comp, 'fieldListGroupedSelectedFields');
    findTestSubject(selectedFields, 'fieldToggle-extension').simulate('click');
    expect(props.onRemoveField).toHaveBeenCalledWith('extension');
  });
  it('should allow adding filters', async function () {
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
  it('should allow filtering by string, and calcFieldCount should just be executed once', function () {
    expect(findTestSubject(comp, 'fieldListGroupedAvailableFields-count').text()).toBe('6');
    act(() => {
      findTestSubject(comp, 'fieldFilterSearchInput').simulate('change', {
        target: { value: 'abc' },
      });
    });
    comp.update();
    expect(findTestSubject(comp, 'fieldListGroupedAvailableFields-count').text()).toBe('4');
    expect(mockCalcFieldCounts.mock.calls.length).toBe(1);
  });

  it('should show "Add a field" button to create a runtime field', () => {
    expect(mockServices.dataViewEditor.userPermissions.editDataView).toHaveBeenCalled();
    expect(findTestSubject(comp, 'dataView-add-field_btn').length).toBe(1);
  });

  it('should not show "Add a field" button on the sql mode', () => {
    const initialProps = getCompProps();
    const propsWithTextBasedMode = {
      ...initialProps,
      onAddFilter: undefined,
      documents$: new BehaviorSubject({
        fetchStatus: FetchStatus.COMPLETE,
        recordRawType: RecordRawType.PLAIN,
        result: getDataTableRecords(stubLogstashDataView),
      }) as DataDocuments$,
    };
    const appStateContainer = getDiscoverStateMock({ isTimeBased: true }).appStateContainer;
    appStateContainer.set({
      query: { sql: 'SELECT * FROM `index`' },
    });
    const compInViewerMode = mountWithIntl(
      <KibanaContextProvider services={mockServices}>
        <DiscoverAppStateProvider value={appStateContainer}>
          <DiscoverSidebarResponsive {...propsWithTextBasedMode} />
        </DiscoverAppStateProvider>
      </KibanaContextProvider>
    );
    expect(findTestSubject(compInViewerMode, 'indexPattern-add-field_btn').length).toBe(0);
  });

  it('should not show "Add a field" button in viewer mode', () => {
    const mockedServicesInViewerMode = {
      ...mockServices,
      dataViewEditor: {
        ...mockServices.dataViewEditor,
        userPermissions: {
          ...mockServices.dataViewEditor.userPermissions,
          editDataView: jest.fn(() => false),
        },
      },
    };
    const appStateContainer = getDiscoverStateMock({ isTimeBased: true }).appStateContainer;
    appStateContainer.set({
      query: { query: '', language: 'lucene' },
      filters: [],
    });
    const compInViewerMode = mountWithIntl(
      <KibanaContextProvider services={mockedServicesInViewerMode}>
        <DiscoverAppStateProvider value={appStateContainer}>
          <DiscoverSidebarResponsive {...props} />
        </DiscoverAppStateProvider>
      </KibanaContextProvider>
    );
    expect(
      mockedServicesInViewerMode.dataViewEditor.userPermissions.editDataView
    ).toHaveBeenCalled();
    expect(findTestSubject(compInViewerMode, 'dataView-add-field_btn').length).toBe(0);
  });
});
