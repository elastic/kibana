/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { act } from 'react-dom/test-utils';
import { mountWithIntl as mount } from '@kbn/test-jest-helpers';
import { findTestSubject } from '@elastic/eui/lib/test';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { indexPatternEditorPluginMock as dataViewEditorPluginMock } from '@kbn/data-view-editor-plugin/public/mocks';
import { ChangeDataView } from './change_dataview';
import { DataViewSelector } from './data_view_selector';
import { dataViewMock, dataViewMockEsql } from './mocks/dataview';
import { DataViewPickerProps } from './data_view_picker';

describe('DataView component', () => {
  const createMockWebStorage = () => ({
    clear: jest.fn(),
    getItem: jest.fn(),
    key: jest.fn(),
    removeItem: jest.fn(),
    setItem: jest.fn(),
    length: 0,
  });

  const createMockStorage = () => ({
    storage: createMockWebStorage(),
    get: jest.fn(),
    set: jest.fn(),
    remove: jest.fn(),
    clear: jest.fn(),
  });
  const getStorage = (v: boolean) => {
    const storage = createMockStorage();
    storage.get.mockReturnValue(v);
    return storage;
  };

  function wrapDataViewComponentInContext(
    testProps: DataViewPickerProps,
    storageValue: boolean,
    uiSettingValue: boolean = false
  ) {
    const dataViewEditorMock = dataViewEditorPluginMock.createStartContract();
    (dataViewEditorMock.userPermissions.editDataView as jest.Mock).mockReturnValue(true);
    let dataMock = dataPluginMock.createStartContract();
    dataMock = {
      ...dataMock,
      dataViews: {
        ...dataMock.dataViews,
        getIdsWithTitle: jest.fn().mockReturnValue([]),
        get: jest.fn().mockReturnValue({ isPersisted: () => true }),
      },
    };
    const services = {
      data: dataMock,
      storage: getStorage(storageValue),
      dataViewEditor: dataViewEditorMock,
      uiSettings: {
        get: jest.fn(() => uiSettingValue),
      },
    };

    return (
      <I18nProvider>
        <KibanaContextProvider services={services}>
          <ChangeDataView {...testProps} />
        </KibanaContextProvider>
      </I18nProvider>
    );
  }
  let props: DataViewPickerProps;
  beforeEach(() => {
    props = {
      currentDataViewId: 'dataview-1',
      trigger: {
        label: 'Dataview 1',
        title: 'Dataview 1',
        fullWidth: true,
        'data-test-subj': 'dataview-trigger',
      },
      onChangeDataView: jest.fn(),
    };
  });

  it('should not render the add runtime field menu if addField is not given', async () => {
    await act(async () => {
      const component = mount(wrapDataViewComponentInContext(props, true));
      findTestSubject(component, 'dataview-trigger').simulate('click');
      expect(component.find('[data-test-subj="indexPattern-add-field"]').length).toBe(0);
    });
  });

  it('should render the add runtime field menu if addField is given', async () => {
    const addFieldSpy = jest.fn();
    const component = mount(
      wrapDataViewComponentInContext({ ...props, onAddField: addFieldSpy }, false)
    );
    findTestSubject(component, 'dataview-trigger').simulate('click');
    expect(component.find('[data-test-subj="indexPattern-add-field"]').at(0).text()).toContain(
      'Add a field to this data view'
    );
    component.find('[data-test-subj="indexPattern-add-field"]').first().simulate('click');
    expect(addFieldSpy).toHaveBeenCalled();
  });

  it('should not render the add dataview menu if onDataViewCreated is not given', async () => {
    await act(async () => {
      const component = mount(wrapDataViewComponentInContext(props, true));
      findTestSubject(component, 'dataview-trigger').simulate('click');
      expect(component.find('[data-test-subj="dataview-create-new"]').length).toBe(0);
    });
  });

  it('should render the add dataview menu if onDataViewCreated is given', async () => {
    const addDataViewSpy = jest.fn();
    const component = mount(
      wrapDataViewComponentInContext({ ...props, onDataViewCreated: addDataViewSpy }, false)
    );
    findTestSubject(component, 'dataview-trigger').simulate('click');
    expect(component.find('[data-test-subj="dataview-create-new"]').at(0).text()).toContain(
      'Create a data view'
    );
    component.find('[data-test-subj="dataview-create-new"]').first().simulate('click');
    expect(addDataViewSpy).toHaveBeenCalled();
  });

  it('should properly handle ad hoc data views', async () => {
    const component = mount(
      wrapDataViewComponentInContext(
        {
          ...props,
          onDataViewCreated: jest.fn(),
          savedDataViews: [
            {
              id: 'dataview-1',
              title: 'dataview-1',
            },
          ],
          adHocDataViews: [dataViewMock],
        },
        false
      )
    );
    findTestSubject(component, 'dataview-trigger').simulate('click');
    expect(component.find(DataViewSelector).prop('dataViewsList')).toStrictEqual([
      {
        id: 'dataview-1',
        title: 'dataview-1',
      },
      {
        id: 'the-data-view-id',
        title: 'the-data-view-title',
        name: 'the-data-view',
        type: 'default',
        isAdhoc: true,
      },
    ]);
  });

  it('should properly handle ES|QL ad hoc data views', async () => {
    const component = mount(
      wrapDataViewComponentInContext(
        {
          ...props,
          onDataViewCreated: jest.fn(),
          savedDataViews: [
            {
              id: 'dataview-1',
              title: 'dataview-1',
            },
          ],
          adHocDataViews: [dataViewMockEsql],
        },
        false
      )
    );
    findTestSubject(component, 'dataview-trigger').simulate('click');
    expect(component.find(DataViewSelector).prop('dataViewsList')).toStrictEqual([
      {
        id: 'dataview-1',
        title: 'dataview-1',
      },
      {
        id: 'the-data-view-esql-id',
        title: 'the-data-view-esql-title',
        name: 'the-data-view-esql',
        type: 'esql',
        isAdhoc: true,
      },
    ]);
  });

  it('should properly handle managed data views', async () => {
    const component = mount(
      wrapDataViewComponentInContext(
        {
          ...props,
          onDataViewCreated: jest.fn(),
          savedDataViews: [
            {
              id: 'dataview-1',
              title: 'dataview-1',
            },
          ],
          managedDataViews: [dataViewMock],
        },
        false
      )
    );
    findTestSubject(component, 'dataview-trigger').simulate('click');
    expect(component.find(DataViewSelector).prop('dataViewsList')).toStrictEqual([
      {
        id: 'dataview-1',
        title: 'dataview-1',
      },
      {
        id: 'the-data-view-id',
        title: 'the-data-view-title',
        name: 'the-data-view',
        type: 'default',
        isManaged: true,
      },
    ]);
  });
});
