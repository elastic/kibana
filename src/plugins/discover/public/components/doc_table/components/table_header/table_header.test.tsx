/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import { TableHeader } from './table_header';
import { findTestSubject } from '@elastic/eui/lib/test';
import { SortOrder } from './helpers';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { DOC_HIDE_TIME_COLUMN_SETTING } from '../../../../../common';
import { FORMATS_UI_SETTINGS } from '@kbn/field-formats-plugin/common';

const defaultUiSettings = {
  get: (key: string) => {
    if (key === DOC_HIDE_TIME_COLUMN_SETTING) {
      return false;
    } else if (key === FORMATS_UI_SETTINGS.SHORT_DOTS_ENABLE) {
      return false;
    }
  },
};

function getMockIndexPattern() {
  return {
    id: 'test',
    title: 'Test',
    timeFieldName: 'time',
    fields: [],
    isTimeNanosBased: () => false,
    getFieldByName: (name: string) => {
      if (name === 'test1') {
        return {
          name,
          displayName: name,
          type: 'string',
          aggregatable: false,
          searchable: true,
          sortable: true,
        } as DataViewField;
      } else {
        return {
          name,
          displayName: name,
          type: 'string',
          aggregatable: false,
          searchable: true,
          sortable: false,
        } as DataViewField;
      }
    },
  } as unknown as DataView;
}

function getMockProps(props = {}) {
  const defaultProps = {
    indexPattern: getMockIndexPattern(),
    hideTimeColumn: false,
    columns: ['first', 'middle', 'last'],
    defaultSortOrder: 'desc',
    sortOrder: [['time', 'asc']] as SortOrder[],
    isShortDots: true,
    onRemoveColumn: jest.fn(),
    onChangeSortOrder: jest.fn(),
    onMoveColumn: jest.fn(),
    onPageNext: jest.fn(),
    onPagePrevious: jest.fn(),
  };

  return Object.assign({}, defaultProps, props);
}

describe('TableHeader with time column', () => {
  const props = getMockProps();

  const wrapper = mountWithIntl(
    <KibanaContextProvider services={{ uiSettings: defaultUiSettings }}>
      <table>
        <thead>
          <TableHeader {...props} />
        </thead>
      </table>
    </KibanaContextProvider>
  );

  test('renders correctly', () => {
    const docTableHeader = findTestSubject(wrapper, 'docTableHeader');
    expect(docTableHeader.getDOMNode()).toMatchSnapshot();
  });

  test('time column is sortable with button, cycling sort direction', () => {
    findTestSubject(wrapper, 'docTableHeaderFieldSort_time').simulate('click');
    expect(props.onChangeSortOrder).toHaveBeenCalledWith([['time', 'desc']]);
  });

  test('time column is not removeable, no button displayed', () => {
    const removeButton = findTestSubject(wrapper, 'docTableRemoveHeader-time');
    expect(removeButton.length).toBe(0);
  });

  test('time column is not moveable, no button displayed', () => {
    const moveButtonLeft = findTestSubject(wrapper, 'docTableMoveLeftHeader-time');
    expect(moveButtonLeft.length).toBe(0);
    const moveButtonRight = findTestSubject(wrapper, 'docTableMoveRightHeader-time');
    expect(moveButtonRight.length).toBe(0);
  });

  test('first column is removeable', () => {
    const removeButton = findTestSubject(wrapper, 'docTableRemoveHeader-first');
    expect(removeButton.length).toBe(1);
    removeButton.simulate('click');
    expect(props.onRemoveColumn).toHaveBeenCalledWith('first');
  });

  test('first column is not moveable to the left', () => {
    const moveButtonLeft = findTestSubject(wrapper, 'docTableMoveLeftHeader-first');
    expect(moveButtonLeft.length).toBe(0);
  });

  test('first column is moveable to the right', () => {
    const moveButtonRight = findTestSubject(wrapper, 'docTableMoveRightHeader-first');
    expect(moveButtonRight.length).toBe(1);
    moveButtonRight.simulate('click');
    expect(props.onMoveColumn).toHaveBeenCalledWith('first', 1);
  });

  test('middle column is moveable to the left', () => {
    const moveButtonLeft = findTestSubject(wrapper, 'docTableMoveLeftHeader-middle');
    expect(moveButtonLeft.length).toBe(1);
    moveButtonLeft.simulate('click');
    expect(props.onMoveColumn).toHaveBeenCalledWith('middle', 0);
  });

  test('middle column is moveable to the right', () => {
    const moveButtonRight = findTestSubject(wrapper, 'docTableMoveRightHeader-middle');
    expect(moveButtonRight.length).toBe(1);
    moveButtonRight.simulate('click');
    expect(props.onMoveColumn).toHaveBeenCalledWith('middle', 2);
  });

  test('last column moveable to the left', () => {
    const moveButtonLeft = findTestSubject(wrapper, 'docTableMoveLeftHeader-last');
    expect(moveButtonLeft.length).toBe(1);
    moveButtonLeft.simulate('click');
    expect(props.onMoveColumn).toHaveBeenCalledWith('last', 1);
  });
});

describe('TableHeader without time column', () => {
  const props = getMockProps({ hideTimeColumn: true });

  const wrapper = mountWithIntl(
    <KibanaContextProvider
      services={{
        ...defaultUiSettings,
        uiSettings: {
          get: (key: string) => {
            if (key === DOC_HIDE_TIME_COLUMN_SETTING) {
              return true;
            }
          },
        },
      }}
    >
      <table>
        <thead>
          <TableHeader {...props} />
        </thead>
      </table>
    </KibanaContextProvider>
  );

  test('renders correctly', () => {
    const docTableHeader = findTestSubject(wrapper, 'docTableHeader');
    expect(docTableHeader.getDOMNode()).toMatchSnapshot();
  });

  test('first column is removeable', () => {
    const removeButton = findTestSubject(wrapper, 'docTableRemoveHeader-first');
    expect(removeButton.length).toBe(1);
    removeButton.simulate('click');
    expect(props.onRemoveColumn).toHaveBeenCalledWith('first');
  });

  test('first column is not moveable to the left', () => {
    const moveButtonLeft = findTestSubject(wrapper, 'docTableMoveLeftHeader-first');
    expect(moveButtonLeft.length).toBe(0);
  });

  test('first column is moveable to the right', () => {
    const moveButtonRight = findTestSubject(wrapper, 'docTableMoveRightHeader-first');
    expect(moveButtonRight.length).toBe(1);
    moveButtonRight.simulate('click');
    expect(props.onMoveColumn).toHaveBeenCalledWith('first', 1);
  });

  test('middle column is moveable to the left', () => {
    const moveButtonLeft = findTestSubject(wrapper, 'docTableMoveLeftHeader-middle');
    expect(moveButtonLeft.length).toBe(1);
    moveButtonLeft.simulate('click');
    expect(props.onMoveColumn).toHaveBeenCalledWith('middle', 0);
  });

  test('middle column is moveable to the right', () => {
    const moveButtonRight = findTestSubject(wrapper, 'docTableMoveRightHeader-middle');
    expect(moveButtonRight.length).toBe(1);
    moveButtonRight.simulate('click');
    expect(props.onMoveColumn).toHaveBeenCalledWith('middle', 2);
  });

  test('last column moveable to the left', () => {
    const moveButtonLeft = findTestSubject(wrapper, 'docTableMoveLeftHeader-last');
    expect(moveButtonLeft.length).toBe(1);
    moveButtonLeft.simulate('click');
    expect(props.onMoveColumn).toHaveBeenCalledWith('last', 1);
  });
});
