/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { ReactWrapper } from 'enzyme';
import { act } from 'react-dom/test-utils';
import { findTestSubject } from '@elastic/eui/lib/test';
import { Action } from '@kbn/ui-actions-plugin/public';
import { getDataTableRecords } from '../../../../__fixtures__/real_hits';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import React from 'react';
import {
  DiscoverSidebarComponent as DiscoverSidebar,
  DiscoverSidebarProps,
} from './discover_sidebar';
import type { AggregateQuery, Query } from '@kbn/es-query';
import { createDiscoverServicesMock } from '../../../../__mocks__/services';
import { stubLogstashDataView } from '@kbn/data-plugin/common/stubs';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { BehaviorSubject } from 'rxjs';
import { FetchStatus } from '../../../types';
import { AvailableFields$, DataDocuments$ } from '../../services/discover_data_state_container';
import { getDiscoverStateMock } from '../../../../__mocks__/discover_state.mock';
import { VIEW_MODE } from '../../../../../common/constants';
import { DiscoverMainProvider } from '../../services/discover_state_provider';
import * as ExistingFieldsHookApi from '@kbn/unified-field-list-plugin/public/hooks/use_existing_fields';
import { ExistenceFetchStatus } from '@kbn/unified-field-list-plugin/public';
import { getDataViewFieldList } from './lib/get_field_list';

const mockGetActions = jest.fn<Promise<Array<Action<object>>>, [string, { fieldName: string }]>(
  () => Promise.resolve([])
);

jest.spyOn(ExistingFieldsHookApi, 'useExistingFieldsReader');

jest.mock('../../../../kibana_services', () => ({
  getUiActions: () => ({
    getTriggerCompatibleActions: mockGetActions,
  }),
}));

function getStateContainer({ query }: { query?: Query | AggregateQuery }) {
  const state = getDiscoverStateMock({ isTimeBased: true });
  state.appState.set({
    query: query ?? { query: '', language: 'lucene' },
    filters: [],
  });
  state.internalState.transitions.setDataView(stubLogstashDataView);
  return state;
}

function getCompProps(): DiscoverSidebarProps {
  const dataView = stubLogstashDataView;
  dataView.toSpec = jest.fn(() => ({}));
  const hits = getDataTableRecords(dataView);

  const fieldCounts: Record<string, number> = {};

  for (const hit of hits) {
    for (const key of Object.keys(hit.flattened)) {
      fieldCounts[key] = (fieldCounts[key] || 0) + 1;
    }
  }

  const allFields = getDataViewFieldList(dataView, fieldCounts);

  (ExistingFieldsHookApi.useExistingFieldsReader as jest.Mock).mockClear();
  (ExistingFieldsHookApi.useExistingFieldsReader as jest.Mock).mockImplementation(() => ({
    hasFieldData: (dataViewId: string, fieldName: string) => {
      return dataViewId === dataView.id && Object.keys(fieldCounts).includes(fieldName);
    },
    getFieldsExistenceStatus: (dataViewId: string) => {
      return dataViewId === dataView.id
        ? ExistenceFetchStatus.succeeded
        : ExistenceFetchStatus.unknown;
    },
    isFieldsExistenceInfoUnavailable: (dataViewId: string) => dataViewId !== dataView.id,
  }));

  const availableFields$ = new BehaviorSubject({
    fetchStatus: FetchStatus.COMPLETE,
    fields: [] as string[],
  }) as AvailableFields$;

  const documents$ = new BehaviorSubject({
    fetchStatus: FetchStatus.COMPLETE,
    result: hits,
  }) as DataDocuments$;

  return {
    columns: ['extension'],
    allFields,
    onChangeDataView: jest.fn(),
    onAddFilter: jest.fn(),
    onAddField: jest.fn(),
    onRemoveField: jest.fn(),
    selectedDataView: dataView,
    trackUiMetric: jest.fn(),
    onFieldEdited: jest.fn(),
    editField: jest.fn(),
    viewMode: VIEW_MODE.DOCUMENT_LEVEL,
    createNewDataView: jest.fn(),
    onDataViewCreated: jest.fn(),
    documents$,
    availableFields$,
    useNewFieldsApi: true,
    showFieldList: true,
    isAffectedByGlobalFilter: false,
    isProcessing: false,
  };
}

async function mountComponent(
  props: DiscoverSidebarProps,
  appStateParams: { query?: Query | AggregateQuery } = {}
): Promise<ReactWrapper<DiscoverSidebarProps>> {
  let comp: ReactWrapper<DiscoverSidebarProps>;
  const mockedServices = createDiscoverServicesMock();
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
        <DiscoverMainProvider value={getStateContainer(appStateParams)}>
          <DiscoverSidebar {...props} />
        </DiscoverMainProvider>
      </KibanaContextProvider>
    );
    // wait for lazy modules
    await new Promise((resolve) => setTimeout(resolve, 0));
    await comp.update();
  });

  await comp!.update();

  return comp!;
}

describe('discover sidebar', function () {
  let props: DiscoverSidebarProps;

  beforeEach(async () => {
    props = getCompProps();
  });

  it('should hide field list', async function () {
    const comp = await mountComponent({
      ...props,
      showFieldList: false,
    });
    expect(findTestSubject(comp, 'fieldListGroupedFieldGroups').exists()).toBe(false);
  });
  it('should have Selected Fields and Available Fields with Popular Fields sections', async function () {
    const comp = await mountComponent(props);
    const popularFieldsCount = findTestSubject(comp, 'fieldListGroupedPopularFields-count');
    const selectedFieldsCount = findTestSubject(comp, 'fieldListGroupedSelectedFields-count');
    const availableFieldsCount = findTestSubject(comp, 'fieldListGroupedAvailableFields-count');
    expect(popularFieldsCount.text()).toBe('4');
    expect(availableFieldsCount.text()).toBe('3');
    expect(selectedFieldsCount.text()).toBe('1');
    expect(findTestSubject(comp, 'fieldListGroupedFieldGroups').exists()).toBe(true);
  });
  it('should allow selecting fields', async function () {
    const comp = await mountComponent(props);
    const availableFields = findTestSubject(comp, 'fieldListGroupedAvailableFields');
    findTestSubject(availableFields, 'fieldToggle-bytes').simulate('click');
    expect(props.onAddField).toHaveBeenCalledWith('bytes');
  });
  it('should allow deselecting fields', async function () {
    const comp = await mountComponent(props);
    const availableFields = findTestSubject(comp, 'fieldListGroupedAvailableFields');
    findTestSubject(availableFields, 'fieldToggle-extension').simulate('click');
    expect(props.onRemoveField).toHaveBeenCalledWith('extension');
  });

  it('should render "Add a field" button', async () => {
    const comp = await mountComponent(props);
    const addFieldButton = findTestSubject(comp, 'dataView-add-field_btn');
    expect(addFieldButton.length).toBe(1);
    addFieldButton.simulate('click');
    expect(props.editField).toHaveBeenCalledWith();
  });

  it('should render "Edit field" button', async () => {
    const comp = await mountComponent(props);
    const availableFields = findTestSubject(comp, 'fieldListGroupedAvailableFields');
    await act(async () => {
      findTestSubject(availableFields, 'field-bytes').simulate('click');
    });
    await comp.update();
    const editFieldButton = findTestSubject(comp, 'discoverFieldListPanelEdit-bytes');
    expect(editFieldButton.length).toBe(1);
    editFieldButton.simulate('click');
    expect(props.editField).toHaveBeenCalledWith('bytes');
  });

  it('should not render Add/Edit field buttons in viewer mode', async () => {
    const compInViewerMode = await mountComponent({
      ...getCompProps(),
      editField: undefined,
    });
    const addFieldButton = findTestSubject(compInViewerMode, 'dataView-add-field_btn');
    expect(addFieldButton.length).toBe(0);
    const availableFields = findTestSubject(compInViewerMode, 'fieldListGroupedAvailableFields');
    await act(async () => {
      findTestSubject(availableFields, 'field-bytes').simulate('click');
    });
    const editFieldButton = findTestSubject(compInViewerMode, 'discoverFieldListPanelEdit-bytes');
    expect(editFieldButton.length).toBe(0);
  });

  it('should render buttons in data view picker correctly', async () => {
    const propsWithPicker = {
      ...getCompProps(),
      showDataViewPicker: true,
    };
    const compWithPicker = await mountComponent(propsWithPicker);
    // open data view picker
    findTestSubject(compWithPicker, 'dataView-switch-link').simulate('click');
    expect(findTestSubject(compWithPicker, 'changeDataViewPopover').length).toBe(1);
    // click "Add a field"
    const addFieldButtonInDataViewPicker = findTestSubject(
      compWithPicker,
      'indexPattern-add-field'
    );
    expect(addFieldButtonInDataViewPicker.length).toBe(1);
    addFieldButtonInDataViewPicker.simulate('click');
    expect(propsWithPicker.editField).toHaveBeenCalledWith();
    // click "Create a data view"
    const createDataViewButton = findTestSubject(compWithPicker, 'dataview-create-new');
    expect(createDataViewButton.length).toBe(1);
    createDataViewButton.simulate('click');
    expect(propsWithPicker.createNewDataView).toHaveBeenCalled();
  });

  it('should not render buttons in data view picker when in viewer mode', async () => {
    const compWithPickerInViewerMode = await mountComponent({
      ...getCompProps(),
      showDataViewPicker: true,
      editField: undefined,
      createNewDataView: undefined,
    });
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
  });

  it('should render the Visualize in Lens button in text based languages mode', async () => {
    const compInViewerMode = await mountComponent(getCompProps(), {
      query: { sql: 'SELECT * FROM test' },
    });
    const visualizeField = findTestSubject(compInViewerMode, 'textBased-visualize');
    expect(visualizeField.length).toBe(1);
  });
});
