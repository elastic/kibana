/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React from 'react';
import { shallowWithI18nProvider, mountWithI18nProvider } from 'test_utils/enzyme_helpers';
import { findTestSubject } from '@elastic/eui/lib/test';
import { keys } from '@elastic/eui';
import { httpServiceMock } from '../../../../../../core/public/mocks';
import { actionServiceMock } from '../../../services/action_service.mock';
import { columnServiceMock } from '../../../services/column_service.mock';
import { SavedObjectsManagementAction } from '../../..';
import { Table, TableProps } from './table';

const defaultProps: TableProps = {
  basePath: httpServiceMock.createSetupContract().basePath,
  actionRegistry: actionServiceMock.createStart(),
  columnRegistry: columnServiceMock.createStart(),
  selectedSavedObjects: [
    {
      id: '1',
      type: 'index-pattern',
      attributes: {},
      references: [],
      meta: {
        title: `MyIndexPattern*`,
        icon: 'indexPatternApp',
        editUrl: '#/management/kibana/indexPatterns/patterns/1',
        inAppUrl: {
          path: '/management/kibana/indexPatterns/patterns/1',
          uiCapabilitiesPath: 'management.kibana.indexPatterns',
        },
      },
    },
  ],
  selectionConfig: {
    onSelectionChange: () => {},
  },
  filterOptions: [{ value: 2 }],
  onDelete: () => {},
  onActionRefresh: () => {},
  onExport: () => {},
  goInspectObject: () => {},
  canGoInApp: () => true,
  pageIndex: 1,
  pageSize: 2,
  items: [
    {
      id: '1',
      type: 'index-pattern',
      attributes: {},
      references: [],
      meta: {
        title: `MyIndexPattern*`,
        icon: 'indexPatternApp',
        editUrl: '#/management/kibana/indexPatterns/patterns/1',
        inAppUrl: {
          path: '/management/kibana/indexPatterns/patterns/1',
          uiCapabilitiesPath: 'management.kibana.indexPatterns',
        },
      },
    },
  ],
  itemId: 'id',
  totalItemCount: 3,
  onQueryChange: () => {},
  onTableChange: () => {},
  isSearching: false,
  onShowRelationships: () => {},
  canDelete: true,
};

describe('Table', () => {
  it('should render normally', () => {
    const component = shallowWithI18nProvider(<Table {...defaultProps} />);

    expect(component).toMatchSnapshot();
  });

  it('should handle query parse error', () => {
    const onQueryChangeMock = jest.fn();
    const customizedProps = {
      ...defaultProps,
      onQueryChange: onQueryChangeMock,
    };

    const component = mountWithI18nProvider(<Table {...customizedProps} />);
    const searchBar = findTestSubject(component, 'savedObjectSearchBar');

    // Send invalid query
    searchBar.simulate('keyup', { key: keys.ENTER, target: { value: '?' } });
    expect(onQueryChangeMock).toHaveBeenCalledTimes(0);
    expect(component.state().isSearchTextValid).toBe(false);

    onQueryChangeMock.mockReset();

    // Send valid query to ensure component can recover from invalid query
    searchBar.simulate('keyup', { key: keys.ENTER, target: { value: 'I am valid' } });
    expect(onQueryChangeMock).toHaveBeenCalledTimes(1);
    expect(component.state().isSearchTextValid).toBe(true);
  });

  it(`prevents saved objects from being deleted`, () => {
    const selectedSavedObjects = [
      { type: 'visualization' },
      { type: 'search' },
      { type: 'index-pattern' },
    ] as any;
    const customizedProps = { ...defaultProps, selectedSavedObjects, canDelete: false };
    const component = shallowWithI18nProvider(<Table {...customizedProps} />);

    expect(component).toMatchSnapshot();
  });

  it(`allows for automatic refreshing after an action`, () => {
    const actionRegistry = actionServiceMock.createStart();
    actionRegistry.getAll.mockReturnValue([
      {
        // minimal action mock to exercise this test case
        id: 'someAction',
        render: () => <div>action!</div>,
        refreshOnFinish: () => true,
        euiAction: { name: 'foo', description: 'bar', icon: 'beaker', type: 'icon' },
        registerOnFinishCallback: (callback: Function) => callback(), // call the callback immediately for this test
      } as SavedObjectsManagementAction,
    ]);
    const onActionRefresh = jest.fn();
    const customizedProps = { ...defaultProps, actionRegistry, onActionRefresh };
    const component = shallowWithI18nProvider(<Table {...customizedProps} />);

    const table = component.find('EuiBasicTable');
    const columns = table.prop('columns') as any[];
    const actionColumn = columns.find((x) => x.hasOwnProperty('actions')) as { actions: any[] };
    const someAction = actionColumn.actions.find(
      (x) => x['data-test-subj'] === 'savedObjectsTableAction-someAction'
    );

    expect(onActionRefresh).not.toHaveBeenCalled();
    someAction.onClick();
    expect(onActionRefresh).toHaveBeenCalled();
  });
});
