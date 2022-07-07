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
import { DataViewAttributes } from '@kbn/data-views-plugin/public';
import { SavedObject } from '@kbn/core/types';
import { getDefaultFieldFilter } from './lib/field_filter';
import { DiscoverSidebarComponent as DiscoverSidebar } from './discover_sidebar';
import { discoverServiceMock as mockDiscoverServices } from '../../../../__mocks__/services';
import { stubLogstashIndexPattern } from '@kbn/data-plugin/common/stubs';
import { VIEW_MODE } from '../../../../components/view_mode_toggle';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { BehaviorSubject } from 'rxjs';
import { FetchStatus } from '../../../types';
import { AvailableFields$ } from '../../hooks/use_saved_search';

const mockGetActions = jest.fn<Promise<Array<Action<object>>>, [string, { fieldName: string }]>(
  () => Promise.resolve([])
);

jest.mock('../../../../kibana_services', () => ({
  getUiActions: () => ({
    getTriggerCompatibleActions: mockGetActions,
  }),
}));

function getCompProps(): DiscoverSidebarProps {
  const indexPattern = stubLogstashIndexPattern;
  const hits = getDataTableRecords(indexPattern);

  const indexPatternList = [
    { id: '0', attributes: { title: 'b' } } as SavedObject<DataViewAttributes>,
    { id: '1', attributes: { title: 'a' } } as SavedObject<DataViewAttributes>,
    { id: '2', attributes: { title: 'c' } } as SavedObject<DataViewAttributes>,
  ];

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
    indexPatternList,
    onChangeIndexPattern: jest.fn(),
    onAddFilter: jest.fn(),
    onAddField: jest.fn(),
    onRemoveField: jest.fn(),
    selectedIndexPattern: indexPattern,
    state: {},
    trackUiMetric: jest.fn(),
    fieldFilter: getDefaultFieldFilter(),
    setFieldFilter: jest.fn(),
    onEditRuntimeField: jest.fn(),
    editField: jest.fn(),
    viewMode: VIEW_MODE.DOCUMENT_LEVEL,
    createNewDataView: jest.fn(),
    onDataViewCreated: jest.fn(),
    availableFields$,
    useNewFieldsApi: true,
  };
}

describe('discover sidebar', function () {
  let props: DiscoverSidebarProps;
  let comp: ReactWrapper<DiscoverSidebarProps>;

  beforeAll(() => {
    props = getCompProps();
    comp = mountWithIntl(
      <KibanaContextProvider services={mockDiscoverServices}>
        <DiscoverSidebar {...props} />
      </KibanaContextProvider>
    );
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
    const addFieldButton = findTestSubject(comp, 'indexPattern-add-field_btn');
    expect(addFieldButton.length).toBe(1);
    addFieldButton.simulate('click');
    expect(props.editField).toHaveBeenCalledWith();
  });

  it('should render "Edit field" button', () => {
    findTestSubject(comp, 'field-bytes').simulate('click');
    const editFieldButton = findTestSubject(comp, 'discoverFieldListPanelEdit-bytes');
    expect(editFieldButton.length).toBe(1);
    editFieldButton.simulate('click');
    expect(props.editField).toHaveBeenCalledWith('bytes');
  });

  it('should not render Add/Edit field buttons in viewer mode', () => {
    const compInViewerMode = mountWithIntl(
      <KibanaContextProvider services={mockDiscoverServices}>
        <DiscoverSidebar {...props} editField={undefined} />
      </KibanaContextProvider>
    );
    const addFieldButton = findTestSubject(compInViewerMode, 'indexPattern-add-field_btn');
    expect(addFieldButton.length).toBe(0);
    findTestSubject(comp, 'field-bytes').simulate('click');
    const editFieldButton = findTestSubject(compInViewerMode, 'discoverFieldListPanelEdit-bytes');
    expect(editFieldButton.length).toBe(0);
  });

  it('should render buttons in data view picker correctly', async () => {
    const compWithPicker = mountWithIntl(
      <KibanaContextProvider services={mockDiscoverServices}>
        <DiscoverSidebar {...props} showDataViewPicker />
      </KibanaContextProvider>
    );
    // open data view picker
    findTestSubject(compWithPicker, 'indexPattern-switch-link').simulate('click');
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
        <DiscoverSidebar
          {...props}
          showDataViewPicker
          editField={undefined}
          createNewDataView={undefined}
        />
      </KibanaContextProvider>
    );
    // open data view picker
    findTestSubject(compWithPickerInViewerMode, 'indexPattern-switch-link').simulate('click');
    expect(findTestSubject(compWithPickerInViewerMode, 'changeDataViewPopover').length).toBe(1);
    // check that buttons are not present
    const addFieldButtonInDataViewPicker = findTestSubject(
      compWithPickerInViewerMode,
      'indexPattern-add-field'
    );
    expect(addFieldButtonInDataViewPicker.length).toBe(0);
    const createDataViewButton = findTestSubject(compWithPickerInViewerMode, 'dataview-create-new');
    expect(createDataViewButton.length).toBe(0);
  });
});
