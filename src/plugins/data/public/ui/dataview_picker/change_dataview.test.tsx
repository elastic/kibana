/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { act } from 'react-dom/test-utils';
import { mountWithIntl as mount } from '@kbn/test-jest-helpers';
import { KibanaContextProvider } from 'src/plugins/kibana_react/public';
import { dataPluginMock } from '../../mocks';
import { ChangeDataView } from './change_dataview';
import { EuiTourStep } from '@elastic/eui';
import type { DataViewPickerProps } from './index';

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

  function wrapDataViewComponentInContext(testProps: DataViewPickerProps, storageValue: boolean) {
    let dataMock = dataPluginMock.createStartContract();
    dataMock = {
      ...dataMock,
      dataViews: {
        ...dataMock.dataViews,
        getIdsWithTitle: jest.fn(),
      },
    };
    const services = {
      data: dataMock,
      storage: getStorage(storageValue),
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
  it('should not render the tour component by default', async () => {
    await act(async () => {
      const component = mount(wrapDataViewComponentInContext(props, true));
      expect(component.find(EuiTourStep).prop('isStepOpen')).toBe(false);
    });
  });
  it('should  render the tour component if the showNewMenuTour is true', async () => {
    const component = mount(
      wrapDataViewComponentInContext({ ...props, showNewMenuTour: true }, false)
    );
    expect(component.find(EuiTourStep).prop('isStepOpen')).toBe(true);
  });

  it('should not render the add runtime field menu if addField is not given', async () => {
    await act(async () => {
      const component = mount(wrapDataViewComponentInContext(props, true));
      component.find('[data-test-subj="dataview-trigger"]').first().simulate('click');
      expect(component.find('[data-test-subj="indexPattern-add-field"]').length).toBe(0);
    });
  });

  it('should render the add runtime field menu if addField is given', async () => {
    const addFieldSpy = jest.fn();
    const component = mount(
      wrapDataViewComponentInContext(
        { ...props, onAddField: addFieldSpy, showNewMenuTour: true },
        false
      )
    );
    component.find('[data-test-subj="dataview-trigger"]').first().simulate('click');
    expect(component.find('[data-test-subj="indexPattern-add-field"]').at(0).text()).toContain(
      'Add a field to this data view'
    );
    component.find('[data-test-subj="indexPattern-add-field"]').first().simulate('click');
    expect(addFieldSpy).toHaveBeenCalled();
  });

  it('should not render the add datavuew menu if onDataViewCreated is not given', async () => {
    await act(async () => {
      const component = mount(wrapDataViewComponentInContext(props, true));
      component.find('[data-test-subj="dataview-trigger"]').first().simulate('click');
      expect(component.find('[data-test-subj="idataview-create-new"]').length).toBe(0);
    });
  });

  it('should render the add datavuew menu if onDataViewCreated is given', async () => {
    const addDataViewSpy = jest.fn();
    const component = mount(
      wrapDataViewComponentInContext(
        { ...props, onDataViewCreated: addDataViewSpy, showNewMenuTour: true },
        false
      )
    );
    component.find('[data-test-subj="dataview-trigger"]').first().simulate('click');
    expect(component.find('[data-test-subj="dataview-create-new"]').at(0).text()).toContain(
      'Create a data view'
    );
    component.find('[data-test-subj="dataview-create-new"]').first().simulate('click');
    expect(addDataViewSpy).toHaveBeenCalled();
  });
});
