/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { ReactWrapper } from 'enzyme';
import { findTestSubject } from '@elastic/eui/lib/test';
import { Action } from '@kbn/ui-actions-plugin/public';
import { getDataTableRecords } from '../../../../__fixtures__/real_hits';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import React from 'react';
import { DiscoverSidebarProps } from './discover_sidebar';
import { DataViewListItem } from '@kbn/data-views-plugin/public';
import { getDefaultFieldFilter } from './lib/field_filter';
import { DiscoverSidebarComponent as DiscoverSidebar } from './discover_sidebar';
import { discoverServiceMock as mockDiscoverServices } from '../../../../__mocks__/services';
import { stubLogstashDataView } from '@kbn/data-plugin/common/stubs';
import { VIEW_MODE } from '../../../../components/view_mode_toggle';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { BehaviorSubject } from 'rxjs';
import { FetchStatus } from '../../../types';
import { getDiscoverStateMock } from '../../../../__mocks__/discover_state.mock';
import { AvailableFields$ } from '../../services/discover_data_state_container';
import { DiscoverMainProvider } from '../../services/discover_state_react';

const mockGetActions = jest.fn<Promise<Array<Action<object>>>, [string, { fieldName: string }]>(
  () => Promise.resolve([])
);

jest.mock('../../../../kibana_services', () => ({
  getUiActions: () => ({
    getTriggerCompatibleActions: mockGetActions,
  }),
}));
const dataViewList = [
  { id: '0', title: 'b' } as DataViewListItem,
  { id: '1', title: 'a' } as DataViewListItem,
  { id: '2', title: 'c' } as DataViewListItem,
];

function getStateContainer() {
  const state = getDiscoverStateMock({ isTimeBased: true });
  state.appState.set({
    query: { query: '', language: 'lucene' },
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
  const availableFields$ = new BehaviorSubject({
    fetchStatus: FetchStatus.COMPLETE,
    fields: [] as string[],
  }) as AvailableFields$;

  return {
    columns: ['extension'],
    fieldCounts,
    documents: hits,
    onAddFilter: jest.fn(),
    onAddField: jest.fn(),
    onRemoveField: jest.fn(),
    selectedDataView: dataView,
    trackUiMetric: jest.fn(),
    fieldFilter: getDefaultFieldFilter(),
    setFieldFilter: jest.fn(),
    onFieldEdited: jest.fn(),
    editField: jest.fn(),
    viewMode: VIEW_MODE.DOCUMENT_LEVEL,
    createNewDataView: jest.fn(),
    onDataViewCreated: jest.fn(),
    availableFields$,
    useNewFieldsApi: true,
    stateContainer: getStateContainer(),
  };
}

describe('discover sidebar', function () {
  let props: DiscoverSidebarProps;
  let comp: ReactWrapper<DiscoverSidebarProps>;

  beforeAll(async () => {
    props = getCompProps();

    mockDiscoverServices.data.dataViews.get = jest.fn().mockImplementation((id) => {
      const dataView = dataViewList.find((d) => d.id === id);
      return { ...dataView, isPersisted: () => true };
    });

    comp = await mountWithIntl(
      <KibanaContextProvider services={mockDiscoverServices}>
        <DiscoverMainProvider value={getStateContainer()}>
          <DiscoverSidebar {...props} />
        </DiscoverMainProvider>
      </KibanaContextProvider>
    );
    // wait for lazy modules
    await new Promise((resolve) => setTimeout(resolve, 0));
    await comp.update();
  });

  it('should have Selected Fields and Available Fields with Popular Fields sections', function () {
    const popular = findTestSubject(comp, 'fieldList-popular');
    const selected = findTestSubject(comp, 'fieldList-selected');
    const unpopular = findTestSubject(comp, 'fieldList-unpopular');
    expect(popular.children().length).toBe(1);
    expect(unpopular.children().length).toBe(6);
    expect(selected.children().length).toBe(1);
  });
  it('should allow selecting fields', function () {
    findTestSubject(comp, 'fieldToggle-bytes').simulate('click');
    expect(props.onAddField).toHaveBeenCalledWith('bytes');
  });
  it('should allow deselecting fields', function () {
    findTestSubject(comp, 'fieldToggle-extension').simulate('click');
    expect(props.onRemoveField).toHaveBeenCalledWith('extension');
  });

  it('should render "Add a field" button', () => {
    const addFieldButton = findTestSubject(comp, 'dataView-add-field_btn');
    expect(addFieldButton.length).toBe(1);
    addFieldButton.simulate('click');
    expect(props.editField).toHaveBeenCalledWith();
  });

  it('should render "Edit field" button', async () => {
    findTestSubject(comp, 'field-bytes').simulate('click');
    await new Promise((resolve) => setTimeout(resolve, 0));
    await comp.update();
    const editFieldButton = findTestSubject(comp, 'discoverFieldListPanelEdit-bytes');
    expect(editFieldButton.length).toBe(1);
    editFieldButton.simulate('click');
    expect(props.editField).toHaveBeenCalledWith('bytes');
  });

  it('should not render Add/Edit field buttons in viewer mode', () => {
    const compInViewerMode = mountWithIntl(
      <KibanaContextProvider services={mockDiscoverServices}>
        <DiscoverMainProvider value={getStateContainer()}>
          <DiscoverSidebar {...props} editField={undefined} />
        </DiscoverMainProvider>
      </KibanaContextProvider>
    );
    const addFieldButton = findTestSubject(compInViewerMode, 'dataView-add-field_btn');
    expect(addFieldButton.length).toBe(0);
    findTestSubject(comp, 'field-bytes').simulate('click');
    const editFieldButton = findTestSubject(compInViewerMode, 'discoverFieldListPanelEdit-bytes');
    expect(editFieldButton.length).toBe(0);
  });

  it('should render buttons in data view picker correctly', async () => {
    const compWithPicker = mountWithIntl(
      <KibanaContextProvider services={mockDiscoverServices}>
        <DiscoverMainProvider value={getStateContainer()}>
          <DiscoverSidebar {...props} showDataViewPicker />
        </DiscoverMainProvider>
      </KibanaContextProvider>
    );
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
    expect(props.editField).toHaveBeenCalledWith();
    // click "Create a data view"
    const createDataViewButton = findTestSubject(compWithPicker, 'dataview-create-new');
    expect(createDataViewButton.length).toBe(1);
    createDataViewButton.simulate('click');
    expect(props.createNewDataView).toHaveBeenCalled();
  });

  it('should not render buttons in data view picker when in viewer mode', async () => {
    const compWithPickerInViewerMode = mountWithIntl(
      <KibanaContextProvider services={mockDiscoverServices}>
        <DiscoverMainProvider value={getStateContainer()}>
          <DiscoverSidebar
            {...props}
            showDataViewPicker
            editField={undefined}
            createNewDataView={undefined}
          />
        </DiscoverMainProvider>
      </KibanaContextProvider>
    );
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

  it('should render the Visualize in Lens button in text based languages mode', () => {
    const compInViewerMode = mountWithIntl(
      <KibanaContextProvider services={mockDiscoverServices}>
        <DiscoverMainProvider value={getStateContainer()}>
          <DiscoverSidebar {...props} onAddFilter={undefined} />
        </DiscoverMainProvider>
      </KibanaContextProvider>
    );
    const visualizeField = findTestSubject(compInViewerMode, 'textBased-visualize');
    expect(visualizeField.length).toBe(1);
  });
});
