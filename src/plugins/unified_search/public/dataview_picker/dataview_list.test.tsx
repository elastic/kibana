/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiSelectable } from '@elastic/eui';
import { act } from 'react-dom/test-utils';
import { ShallowWrapper } from 'enzyme';
import { shallowWithIntl as shallow } from '@kbn/test-jest-helpers';
import { DataViewsList, DataViewsListProps } from './dataview_list';

function getDataViewPickerList(instance: ShallowWrapper) {
  return instance.find(EuiSelectable).first();
}

function getDataViewPickerOptions(instance: ShallowWrapper) {
  return getDataViewPickerList(instance).prop('options');
}

function selectDataViewPickerOption(instance: ShallowWrapper, selectedLabel: string) {
  const options: Array<{ label: string; checked?: 'on' | 'off' }> = getDataViewPickerOptions(
    instance
  ).map((option: { label: string }) =>
    option.label === selectedLabel
      ? { ...option, checked: 'on' }
      : { ...option, checked: undefined }
  );
  return getDataViewPickerList(instance).prop('onChange')!(options);
}

describe('DataView list component', () => {
  const list = [
    {
      id: 'dataview-1',
      title: 'dataview-1',
    },
    {
      id: 'dataview-2',
      title: 'dataview-2',
    },
  ];
  const changeDataViewSpy = jest.fn();
  let props: DataViewsListProps;
  beforeEach(() => {
    props = {
      currentDataViewId: 'dataview-1',
      onChangeDataView: changeDataViewSpy,
      dataViewsList: list,
    };
  });
  it('should trigger the onChangeDataView if a new dataview is selected', async () => {
    const component = shallow(<DataViewsList {...props} />);
    await act(async () => {
      selectDataViewPickerOption(component, 'dataview-2');
    });
    expect(changeDataViewSpy).toHaveBeenCalled();
  });

  it('should list all dataviiew', () => {
    const component = shallow(<DataViewsList {...props} />);

    expect(getDataViewPickerOptions(component)!.map((option: any) => option.label)).toEqual([
      'dataview-1',
      'dataview-2',
    ]);
  });
});
