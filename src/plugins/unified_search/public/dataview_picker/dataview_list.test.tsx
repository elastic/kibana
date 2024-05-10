/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { MouseEvent } from 'react';
import { EuiSelectable } from '@elastic/eui';
import { act } from 'react-dom/test-utils';
import { ShallowWrapper } from 'enzyme';
import { shallowWithIntl as shallow } from '@kbn/test-jest-helpers';
import { DataViewListItemEnhanced, DataViewsList, DataViewsListProps } from './dataview_list';
import { ESQL_TYPE } from '@kbn/data-view-utils';

function getDataViewPickerList(instance: ShallowWrapper) {
  return instance.find(EuiSelectable).first();
}

function getDataViewPickerOptions(instance: ShallowWrapper) {
  return getDataViewPickerList(instance).prop('options');
}

function selectDataViewPickerOption(instance: ShallowWrapper, selectedLabel: string) {
  const event = {} as MouseEvent;
  const options: Array<{ label: string; checked?: 'on' | 'off' }> = getDataViewPickerOptions(
    instance
  ).map((option: { label: string }) =>
    option.label === selectedLabel
      ? { ...option, checked: 'on' }
      : { ...option, checked: undefined }
  );
  const selectedOption = { label: selectedLabel };
  return getDataViewPickerList(instance).prop('onChange')!(options, event, selectedOption);
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
      isTextBasedLangSelected: false,
    };
  });

  it('should trigger the onChangeDataView if a new dataview is selected', async () => {
    const component = shallow(<DataViewsList {...props} />);
    await act(async () => {
      selectDataViewPickerOption(component, 'dataview-2');
    });
    expect(changeDataViewSpy).toHaveBeenCalled();
  });

  it('should list all dataviews', () => {
    const component = shallow(<DataViewsList {...props} />);

    expect(getDataViewPickerOptions(component)!.map((option: any) => option.label)).toEqual([
      'dataview-1',
      'dataview-2',
    ]);
  });

  it('should render a warning icon if a text based language is selected', () => {
    const component = shallow(<DataViewsList {...props} isTextBasedLangSelected />);

    expect(getDataViewPickerOptions(component)!.map((option: any) => option.append)).not.toBeNull();
  });

  describe('ad hoc data views', () => {
    const runAdHocDataViewTest = (
      esqlMode: boolean,
      esqlDataViews: DataViewListItemEnhanced[] = []
    ) => {
      const dataViewList = [
        ...list,
        {
          id: 'dataview-3',
          title: 'dataview-3',
          isAdhoc: true,
        },
        ...esqlDataViews,
      ];
      const component = shallow(
        <DataViewsList {...props} dataViewsList={dataViewList} isTextBasedLangSelected={esqlMode} />
      );
      expect(getDataViewPickerOptions(component)!.map((option: any) => option.label)).toEqual([
        'dataview-1',
        'dataview-2',
        'dataview-3',
      ]);
    };

    const esqlDataViews: DataViewListItemEnhanced[] = [
      {
        id: 'dataview-4',
        title: 'dataview-4',
        type: ESQL_TYPE,
        isAdhoc: true,
      },
    ];

    it('should show ad hoc data views for text based mode', () => {
      runAdHocDataViewTest(true);
    });

    it('should show ad hoc data views for data view mode', () => {
      runAdHocDataViewTest(false);
    });

    it('should not show ES|QL ad hoc data views for text based mode', () => {
      runAdHocDataViewTest(true, esqlDataViews);
    });

    it('should not show ES|QL ad hoc data views for data view mode', () => {
      runAdHocDataViewTest(false, esqlDataViews);
    });
  });
});
