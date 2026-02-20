/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render, screen, act as rtlAct } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BehaviorSubject } from 'rxjs';
import type { ReactWrapper } from 'enzyme';
import { findTestSubject } from '@elastic/eui/lib/test';
import { EuiProgress } from '@elastic/eui';
import { getDataTableRecords, realHits } from '../../../../__fixtures__/real_hits';
import { act } from 'react-dom/test-utils';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import React from 'react';
import type { DiscoverSidebarResponsiveProps } from './discover_sidebar_responsive';
import { DiscoverSidebarResponsive } from './discover_sidebar_responsive';
import type { DiscoverServices } from '../../../../build_services';
import type { SidebarToggleState } from '../../../types';
import { FetchStatus } from '../../../types';
import type { DataDocuments$ } from '../../state_management/discover_data_state_container';
import { stubLogstashDataView } from '@kbn/data-plugin/common/stubs';
import { getDiscoverStateMock } from '../../../../__mocks__/discover_state.mock';
import * as ExistingFieldsServiceApi from '@kbn/unified-field-list/src/services/field_existing/load_field_existing';
import { resetExistingFieldsCache } from '@kbn/unified-field-list/src/hooks/use_existing_fields';
import { createDiscoverServicesMock } from '../../../../__mocks__/services';
import type { AggregateQuery, Query } from '@kbn/es-query';
import { buildDataTableRecord } from '@kbn/discover-utils';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { DiscoverCustomizationId } from '../../../../customizations/customization_service';
import type { SearchBarCustomization } from '../../../../customizations';
import { DiscoverTestProvider } from '../../../../__mocks__/test_provider';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { UnifiedFieldListRestorableState } from '@kbn/unified-field-list';
import { internalStateActions } from '../../state_management/redux';

type TestWrapperProps = DiscoverSidebarResponsiveProps & { selectedDataView: DataView };

const mockSearchBarCustomization: SearchBarCustomization = {
  id: 'search_bar',
  CustomDataViewPicker: jest
    .fn(() => <div data-test-subj="custom-data-view-picker" />)
    .mockName('CustomDataViewPickerMock'),
};

let mockUseCustomizations = false;

jest.mock('../../../../customizations', () => ({
  ...jest.requireActual('../../../../customizations'),
  useDiscoverCustomization: jest.fn((id: DiscoverCustomizationId) => {
    if (!mockUseCustomizations) {
      return undefined;
    }

    switch (id) {
      case 'search_bar':
        return mockSearchBarCustomization;
      default:
        throw new Error(`Unknown customization id: ${id}`);
    }
  }),
}));

const mockGetRecommendedFieldsAccessor = jest.fn();

jest.mock('../../../../context_awareness', () => ({
  ...jest.requireActual('../../../../context_awareness'),
  useProfileAccessor: jest.fn((accessorId: string) => {
    if (accessorId === 'getRecommendedFields') {
      return mockGetRecommendedFieldsAccessor;
    }
    return jest.fn(() => ({}));
  }),
}));

jest.mock('lodash', () => {
  const original = jest.requireActual('lodash');

  return {
    ...original,
    debounce: (fn: unknown) => fn,
  };
});

jest.mock('@kbn/unified-field-list/src/services/field_stats', () => ({
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
  } as unknown as DiscoverServices;
  return mockServices;
}

const mockfieldCounts: Record<string, number> = {};
const mockCalcFieldCounts = jest.fn(() => {
  return mockfieldCounts;
});

jest.mock('@kbn/discover-utils/src/utils/calc_field_counts', () => ({
  calcFieldCounts: () => mockCalcFieldCounts(),
}));

jest.spyOn(ExistingFieldsServiceApi, 'loadFieldExisting');

function getCompProps(options?: { hits?: DataTableRecord[] }): TestWrapperProps {
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
    onChangeDataView: jest.fn(),
    onAddBreakdownField: jest.fn(),
    onAddFilter: jest.fn(),
    onAddField: jest.fn(),
    onRemoveField: jest.fn(),
    selectedDataView: dataView,
    trackUiMetric: jest.fn(),
    onFieldEdited: jest.fn(),
    onDataViewCreated: jest.fn(),
    sidebarToggleState$: new BehaviorSubject<SidebarToggleState>({
      isCollapsed: false,
      toggle: () => {},
    }),
  };
}

function getStateContainer({
  query,
  fieldListUiState,
}: {
  query?: Query | AggregateQuery;
  fieldListUiState?: Partial<UnifiedFieldListRestorableState>;
}) {
  const stateContainer = getDiscoverStateMock({ isTimeBased: true });
  stateContainer.internalState.dispatch(
    stateContainer.injectCurrentTab(internalStateActions.setAppState)({
      appState: {
        query: query ?? { query: '', language: 'lucene' },
        filters: [],
      },
    })
  );
  if (fieldListUiState) {
    stateContainer.internalState.dispatch(
      stateContainer.injectCurrentTab(internalStateActions.setFieldListUiState)({
        fieldListUiState,
      })
    );
  }
  return stateContainer;
}

type EnzymeReturnType = ReactWrapper<TestWrapperProps>;
type MountReturn<WithRTL extends boolean> = WithRTL extends true ? undefined : EnzymeReturnType;

async function mountComponent<WithReactTestingLibrary extends boolean = false>(
  props: TestWrapperProps,
  appStateParams: {
    query?: Query | AggregateQuery;
    fieldListUiState?: Partial<UnifiedFieldListRestorableState>;
  } = {},
  services?: DiscoverServices,
  withReactTestingLibrary?: WithReactTestingLibrary
): Promise<MountReturn<WithReactTestingLibrary>> {
  let comp: ReactWrapper<TestWrapperProps>;
  const stateContainer = getStateContainer(appStateParams);
  const mockedServices = services ?? createMockServices();
  mockedServices.data.dataViews.getIdsWithTitle = jest.fn(async () =>
    props.selectedDataView
      ? [{ id: props.selectedDataView.id!, title: props.selectedDataView.title! }]
      : []
  );
  mockedServices.data.dataViews.get = jest.fn().mockImplementation(async (id) => {
    return [props.selectedDataView].find((d) => d!.id === id);
  });
  mockedServices.data.query.getState = jest
    .fn()
    .mockImplementation(() => stateContainer.getCurrentTab().appState);

  const component = (
    <DiscoverTestProvider
      services={mockedServices}
      stateContainer={stateContainer}
      runtimeState={{
        currentDataView: props.selectedDataView!,
        adHocDataViews: [],
      }}
    >
      <DiscoverSidebarResponsive {...props} />
    </DiscoverTestProvider>
  );

  if (withReactTestingLibrary) {
    await rtlAct(() => render(component));
    return undefined as MountReturn<WithReactTestingLibrary>;
  }

  await act(async () => {
    comp = mountWithIntl(component);
    // wait for lazy modules
    await new Promise((resolve) => setTimeout(resolve, 0));
    comp.update();
  });

  comp!.update();

  return comp! as unknown as MountReturn<WithReactTestingLibrary>;
}

// FLAKY: https://github.com/elastic/kibana/issues/217005
// FLAKY: https://github.com/elastic/kibana/issues/225125
describe.skip('discover responsive sidebar', function () {
  let props: TestWrapperProps;

  beforeEach(async () => {
    (ExistingFieldsServiceApi.loadFieldExisting as jest.Mock).mockImplementation(async () => ({
      indexPatternTitle: 'test',
      existingFieldNames: Object.keys(mockfieldCounts),
    }));
    props = getCompProps();
    mockUseCustomizations = false;

    // Setup default recommended fields mock
    mockGetRecommendedFieldsAccessor.mockImplementation(() => () => ({ recommendedFields: [] }));
  });

  afterEach(() => {
    mockCalcFieldCounts.mockClear();
    (ExistingFieldsServiceApi.loadFieldExisting as jest.Mock).mockClear();
    mockGetRecommendedFieldsAccessor.mockClear();
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

    const compLoadingExistence = await mountComponent({
      ...props,
      fieldListVariant: 'list-always',
    });

    await act(async () => {
      // wait for lazy modules
      await new Promise((resolve) => setTimeout(resolve, 0));
      compLoadingExistence.update();
    });

    expect(
      findTestSubject(compLoadingExistence, 'fieldListGroupedAvailableFields-countLoading').exists()
    ).toBe(true);
    expect(
      findTestSubject(compLoadingExistence, 'fieldListGroupedAvailableFields-count').exists()
    ).toBe(false);

    expect(compLoadingExistence.find(EuiProgress).exists()).toBe(true);

    await act(async () => {
      const stateContainer = getDiscoverStateMock({ isTimeBased: true });
      stateContainer.internalState.dispatch(
        stateContainer.injectCurrentTab(internalStateActions.setAppState)({
          appState: {
            query: { query: '', language: 'lucene' },
            filters: [],
          },
        })
      );
      resolveFunction!({
        indexPatternTitle: 'test-loaded',
        existingFieldNames: Object.keys(mockfieldCounts),
      });
      compLoadingExistence.update();
    });

    await act(async () => {
      compLoadingExistence.update();
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

    expect(findTestSubject(comp, 'fieldListGrouped__ariaDescription').text()).toBe(
      '1 selected field. 4 popular fields. 3 available fields. 20 empty fields. 2 meta fields.'
    );

    expect(ExistingFieldsServiceApi.loadFieldExisting).toHaveBeenCalledTimes(1);
  });

  describe('when the input is not focused', () => {
    it('should set a11y attributes for the search input in the field list', async function () {
      // When
      await mountComponent(props, undefined, undefined, true);

      // Then
      const a11yDescription = screen.getByTestId('fieldListGrouped__ariaDescription');
      expect(a11yDescription).toHaveAttribute('aria-live', 'off');
      expect(a11yDescription).toHaveTextContent(
        '1 selected field. 4 popular fields. 3 available fields. 20 empty fields. 2 meta fields.'
      );

      const searchInput = screen.getByTestId('fieldListFiltersFieldSearch');
      expect(searchInput).toHaveAttribute('aria-describedby', a11yDescription.id);
    });
  });

  describe('when the input is focused', () => {
    it('should set a11y attributes for the search input in the field list', async function () {
      // Given
      const user = userEvent.setup();

      // When
      await mountComponent(props, undefined, undefined, true);

      // Then
      const searchInput = screen.getByTestId('fieldListFiltersFieldSearch');
      const a11yDescription = screen.getByTestId('fieldListGrouped__ariaDescription');
      await user.click(searchInput);
      expect(searchInput).toHaveAttribute('aria-describedby', a11yDescription.id);

      expect(a11yDescription).toHaveAttribute('aria-live', 'polite');
      expect(a11yDescription).toHaveTextContent(
        '1 selected field. 4 popular fields. 3 available fields. 20 empty fields. 2 meta fields.'
      );
    });
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

    expect(findTestSubject(compWithoutSelected, 'fieldListGrouped__ariaDescription').text()).toBe(
      '4 popular fields. 3 available fields. 20 empty fields. 2 meta fields.'
    );
  });

  it('should not calculate counts if documents are not fetched yet', async function () {
    const propsWithoutDocuments: TestWrapperProps = {
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

  it('should allow adding breakdown field', async function () {
    const comp = await mountComponent(props);
    const availableFields = findTestSubject(comp, 'fieldListGroupedAvailableFields');
    await act(async () => {
      const button = findTestSubject(availableFields, 'field-extension-showDetails');
      button.simulate('click');
      comp.update();
    });

    comp.update();
    findTestSubject(comp, 'fieldPopoverHeader_addBreakdownField-extension').simulate('click');
    expect(props.onAddBreakdownField).toHaveBeenCalled();
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
      button.simulate('click');
      comp.update();
    });

    comp.update();
    findTestSubject(comp, 'plus-extension-gif').simulate('click');
    expect(props.onAddFilter).toHaveBeenCalled();
  });
  it('should allow adding "exist" filter', async function () {
    const comp = await mountComponent(props);
    const availableFields = findTestSubject(comp, 'fieldListGroupedAvailableFields');
    await act(async () => {
      const button = findTestSubject(availableFields, 'field-extension-showDetails');
      button.simulate('click');
      comp.update();
    });

    comp.update();
    findTestSubject(comp, 'discoverFieldListPanelAddExistFilter-extension').simulate('click');
    expect(props.onAddFilter).toHaveBeenCalledWith('_exists_', 'extension', '+');
  });

  it('should allow searching by string, and calcFieldCount should just be executed once', async function () {
    const comp = await mountComponent(props);

    expect(findTestSubject(comp, 'fieldListGroupedAvailableFields-count').text()).toBe('3');
    expect(findTestSubject(comp, 'fieldListGrouped__ariaDescription').text()).toBe(
      '1 selected field. 4 popular fields. 3 available fields. 20 empty fields. 2 meta fields.'
    );

    await act(async () => {
      const input = findTestSubject(comp, 'fieldListFiltersFieldSearch').find('input');
      input.getDOMNode().setAttribute('value', 'byte');
      input.simulate('change');
    });

    expect(findTestSubject(comp, 'fieldListGroupedAvailableFields-count').text()).toBe('1');
    expect(findTestSubject(comp, 'fieldListGrouped__ariaDescription').text()).toBe(
      '1 popular field. 1 available field. 0 meta fields.'
    );
    expect(mockCalcFieldCounts.mock.calls.length).toBe(1);
  });

  it('should allow filtering by field type', async function () {
    const comp = await mountComponent(props);

    expect(findTestSubject(comp, 'fieldListGroupedAvailableFields-count').text()).toBe('3');
    expect(findTestSubject(comp, 'fieldListGrouped__ariaDescription').text()).toBe(
      '1 selected field. 4 popular fields. 3 available fields. 20 empty fields. 2 meta fields.'
    );

    await act(async () => {
      findTestSubject(comp, 'fieldListFiltersFieldTypeFilterToggle').simulate('click');
    });

    comp.update();

    await act(async () => {
      findTestSubject(comp, 'typeFilter-number').simulate('click');
    });

    comp.update();

    expect(findTestSubject(comp, 'fieldListGroupedAvailableFields-count').text()).toBe('2');
    expect(findTestSubject(comp, 'fieldListGrouped__ariaDescription').text()).toBe(
      '1 popular field. 2 available fields. 1 empty field. 0 meta fields.'
    );

    expect(mockCalcFieldCounts.mock.calls.length).toBe(1);
  }, 10000);

  it('should restore sidebar state after switching tabs', async function () {
    const comp = await mountComponent(props, {
      fieldListUiState: {
        nameFilter: 'byte',
        selectedFieldTypes: ['number'],
        pageSize: 10,
        scrollTop: 0,
        accordionState: {},
      },
    });

    expect(findTestSubject(comp, 'fieldListGroupedAvailableFields-count').text()).toBe('1');
    expect(findTestSubject(comp, 'fieldListGrouped__ariaDescription').text()).toBe(
      '1 popular field. 1 available field. 0 meta fields.'
    );
    expect(findTestSubject(comp, 'fieldListFiltersFieldSearch').prop('value')).toBe('byte');
  });

  it('should restore collapsed state state after switching tabs', async function () {
    const compCollapsed = await mountComponent(props, {
      fieldListUiState: {
        isCollapsed: true,
      },
    });

    expect(findTestSubject(compCollapsed, 'fieldList').exists()).toBe(false);

    const compExpanded = await mountComponent(props, {
      fieldListUiState: {
        isCollapsed: false,
      },
    });

    expect(findTestSubject(compExpanded, 'fieldList').exists()).toBe(true);
  });

  it('should show "Add a field" button to create a runtime field', async () => {
    const services = createMockServices();
    const comp = await mountComponent(props, {}, services);
    expect(services.dataViewEditor.userPermissions.editDataView).toHaveBeenCalled();
    expect(findTestSubject(comp, 'dataView-add-field_btn').length).toBe(1);
  });

  it('should render correctly in the ES|QL mode', async () => {
    const propsWithEsqlMode = {
      ...props,
      columns: ['extension', 'bytes'],
      onAddFilter: undefined,
      documents$: new BehaviorSubject({
        fetchStatus: FetchStatus.COMPLETE,
        result: getDataTableRecords(stubLogstashDataView),
        esqlQueryColumns: [
          { id: '1', name: 'extension', meta: { type: 'text' } },
          { id: '2', name: 'bytes', meta: { type: 'number' } },
          { id: '3', name: '@timestamp', meta: { type: 'date' } },
        ],
      }) as DataDocuments$,
    };
    const compInEsqlMode = await mountComponent(propsWithEsqlMode, {
      query: { esql: 'FROM `index`' },
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
      compInEsqlMode.update();
    });

    expect(findTestSubject(compInEsqlMode, 'indexPattern-add-field_btn').length).toBe(0);

    const popularFieldsCount = findTestSubject(
      compInEsqlMode,
      'fieldListGroupedPopularFields-count'
    );
    const selectedFieldsCount = findTestSubject(
      compInEsqlMode,
      'fieldListGroupedSelectedFields-count'
    );
    const availableFieldsCount = findTestSubject(
      compInEsqlMode,
      'fieldListGroupedAvailableFields-count'
    );
    const emptyFieldsCount = findTestSubject(compInEsqlMode, 'fieldListGroupedEmptyFields-count');
    const metaFieldsCount = findTestSubject(compInEsqlMode, 'fieldListGroupedMetaFields-count');
    const unmappedFieldsCount = findTestSubject(
      compInEsqlMode,
      'fieldListGroupedUnmappedFields-count'
    );

    expect(selectedFieldsCount.text()).toBe('2');
    expect(popularFieldsCount.exists()).toBe(false);
    expect(availableFieldsCount.text()).toBe('3');
    expect(emptyFieldsCount.exists()).toBe(false);
    expect(metaFieldsCount.exists()).toBe(false);
    expect(unmappedFieldsCount.exists()).toBe(false);

    expect(mockCalcFieldCounts.mock.calls.length).toBe(0);

    expect(findTestSubject(compInEsqlMode, 'fieldListGrouped__ariaDescription').text()).toBe(
      '2 selected fields. 3 available fields.'
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
    services.dataViewFieldEditor.userPermissions.editIndexPattern = jest.fn(() => false);
    const compInViewerMode = await mountComponent(props, {}, services);
    expect(services.dataViewEditor.userPermissions.editDataView).toHaveBeenCalled();
    expect(findTestSubject(compInViewerMode, 'dataView-add-field_btn').length).toBe(0);
  });

  it('should hide field list if documents status is not initialized', async function () {
    const comp = await mountComponent({
      ...props,
      documents$: new BehaviorSubject({
        fetchStatus: FetchStatus.UNINITIALIZED,
      }) as DataDocuments$,
    });
    expect(findTestSubject(comp, 'fieldListGroupedFieldGroups').exists()).toBe(false);
  });

  it('should render "Add a field" button', async () => {
    const services = createMockServices();
    const comp = await mountComponent(
      {
        ...props,
        fieldListVariant: 'list-always',
      },
      {},
      services
    );
    const addFieldButton = findTestSubject(comp, 'dataView-add-field_btn');
    expect(addFieldButton.length).toBe(1);
    addFieldButton.simulate('click');
    await new Promise(process.nextTick);
    expect(services.dataViewFieldEditor.openEditor).toHaveBeenCalledTimes(1);
  });

  it('should render "Edit field" button', async () => {
    const services = createMockServices();
    const comp = await mountComponent(props, {}, services);
    const availableFields = findTestSubject(comp, 'fieldListGroupedAvailableFields');
    await act(async () => {
      findTestSubject(availableFields, 'field-bytes').simulate('click');
    });
    comp.update();
    const editFieldButton = findTestSubject(comp, 'discoverFieldListPanelEdit-bytes');
    expect(editFieldButton.length).toBe(1);
    editFieldButton.simulate('click');
    await new Promise(process.nextTick);
    expect(services.dataViewFieldEditor.openEditor).toHaveBeenCalledTimes(1);
  });

  it('should not render Add/Edit field buttons in viewer mode', async () => {
    const services = createMockServices();
    services.dataViewFieldEditor.userPermissions.editIndexPattern = jest.fn(() => false);
    const compInViewerMode = await mountComponent(props, {}, services);
    const addFieldButton = findTestSubject(compInViewerMode, 'dataView-add-field_btn');
    expect(addFieldButton.length).toBe(0);
    const availableFields = findTestSubject(compInViewerMode, 'fieldListGroupedAvailableFields');
    await act(async () => {
      findTestSubject(availableFields, 'field-bytes').simulate('click');
    });
    const editFieldButton = findTestSubject(compInViewerMode, 'discoverFieldListPanelEdit-bytes');
    expect(editFieldButton.length).toBe(0);
    expect(services.dataViewEditor.userPermissions.editDataView).toHaveBeenCalled();
  });

  it('should render buttons in data view picker correctly', async () => {
    const services = createMockServices();
    const propsWithPicker: TestWrapperProps = {
      ...props,
      fieldListVariant: 'button-and-flyout-always',
    };
    const compWithPicker = await mountComponent(propsWithPicker, {}, services);
    // open flyout
    await act(async () => {
      compWithPicker.find('.unifiedFieldListSidebar__mobileButton').last().simulate('click');
      compWithPicker.update();
    });

    compWithPicker.update();
    // open data view picker
    findTestSubject(compWithPicker, 'dataView-switch-link').simulate('click');
    expect(findTestSubject(compWithPicker, 'changeDataViewPopover').length).toBe(1);
    // check "Add a field"
    const addFieldButtonInDataViewPicker = findTestSubject(
      compWithPicker,
      'indexPattern-add-field'
    );
    expect(addFieldButtonInDataViewPicker.length).toBe(1);
    // click "Create a data view"
    const createDataViewButton = findTestSubject(compWithPicker, 'dataview-create-new');
    expect(createDataViewButton.length).toBe(1);
    createDataViewButton.simulate('click');
    expect(services.dataViewEditor.openEditor).toHaveBeenCalled();
  }, 10000);

  it('should not render buttons in data view picker when in viewer mode', async () => {
    const services = createMockServices();
    services.dataViewEditor.userPermissions.editDataView = jest.fn(() => false);
    services.dataViewFieldEditor.userPermissions.editIndexPattern = jest.fn(() => false);
    const propsWithPicker: TestWrapperProps = {
      ...props,
      fieldListVariant: 'button-and-flyout-always',
    };
    const compWithPickerInViewerMode = await mountComponent(propsWithPicker, {}, services);
    // open flyout
    await act(async () => {
      compWithPickerInViewerMode
        .find('.unifiedFieldListSidebar__mobileButton')
        .last()
        .simulate('click');
      compWithPickerInViewerMode.update();
    });

    compWithPickerInViewerMode.update();
    // open data view picker
    findTestSubject(compWithPickerInViewerMode, 'dataView-switch-link').simulate('click');
    expect(findTestSubject(compWithPickerInViewerMode, 'changeDataViewPopover').length).toBe(1);
    // check that buttons are not present
    const addFieldButtonInDataViewPicker = findTestSubject(
      compWithPickerInViewerMode,
      'dataView-add-field'
    );
    expect(addFieldButtonInDataViewPicker.length).toBe(0);
    const createDataViewButton = findTestSubject(compWithPickerInViewerMode, 'dataview-create-new');
    expect(createDataViewButton.length).toBe(0);
  }, 10000);

  // FLAKY: https://github.com/elastic/kibana/issues/225126
  describe.skip('search bar customization', () => {
    it('should not render CustomDataViewPicker', async () => {
      mockUseCustomizations = false;
      const comp = await mountComponent({
        ...props,
        fieldListVariant: 'button-and-flyout-always',
      });

      await act(async () => {
        comp.find('.unifiedFieldListSidebar__mobileButton').last().simulate('click');
        comp.update();
      });

      comp.update();

      expect(comp.find('[data-test-subj="custom-data-view-picker"]').exists()).toBe(false);
    });

    it('should render CustomDataViewPicker', async () => {
      mockUseCustomizations = true;
      const comp = await mountComponent({
        ...props,
        fieldListVariant: 'button-and-flyout-always',
      });

      await act(async () => {
        comp.find('.unifiedFieldListSidebar__mobileButton').last().simulate('click');
        comp.update();
      });

      comp.update();

      expect(comp.find('[data-test-subj="custom-data-view-picker"]').exists()).toBe(true);
    });

    it('should allow to toggle sidebar', async function () {
      const comp = await mountComponent(props);
      expect(findTestSubject(comp, 'fieldList').exists()).toBe(true);
      findTestSubject(comp, 'unifiedFieldListSidebar__toggle-collapse').simulate('click');
      expect(findTestSubject(comp, 'fieldList').exists()).toBe(false);
      findTestSubject(comp, 'unifiedFieldListSidebar__toggle-expand').simulate('click');
      expect(findTestSubject(comp, 'fieldList').exists()).toBe(true);
    });
  });

  // FLAKY: https://github.com/elastic/kibana/issues/253542
  describe.skip('recommended fields', () => {
    it('should call getRecommendedFieldsAccessor on component mount', async () => {
      await mountComponent(props);

      expect(mockGetRecommendedFieldsAccessor).toHaveBeenCalled();
    });

    it('should use profile accessor to get recommended fields', async () => {
      const mockRecommendedFields = [
        { name: 'service.name', type: 'keyword' },
        { name: 'host.name', type: 'keyword' },
      ];
      const mockAccessorFn = jest.fn(() => ({ recommendedFields: mockRecommendedFields }));
      mockGetRecommendedFieldsAccessor.mockImplementation(() => mockAccessorFn);

      await mountComponent(props);

      expect(mockGetRecommendedFieldsAccessor).toHaveBeenCalled();
      expect(mockAccessorFn).toHaveBeenCalled();
    });

    it('should use fallback function when profile accessor returns fallback', async () => {
      mockGetRecommendedFieldsAccessor.mockImplementation((fallback) => {
        expect(typeof fallback).toBe('function');
        return fallback;
      });

      await mountComponent(props);

      expect(mockGetRecommendedFieldsAccessor).toHaveBeenCalled();
      // Verify the fallback function was called with the expected structure
      const fallbackCall = mockGetRecommendedFieldsAccessor.mock.calls[0];
      expect(typeof fallbackCall[0]).toBe('function');
      expect(fallbackCall[0]()).toEqual({ recommendedFields: [] });
    });
  });
});
