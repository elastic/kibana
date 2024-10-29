/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { shallowWithI18nProvider, mountWithI18nProvider } from '@kbn/test-jest-helpers';
import { findTestSubject } from '@elastic/eui/lib/test';
import { keys } from '@elastic/eui';
import { httpServiceMock } from '@kbn/core/public/mocks';
import { actionServiceMock } from '../../../services/action_service.mock';
import { columnServiceMock } from '../../../services/column_service.mock';
import { Table, TableProps } from './table';
import { render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

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
        editUrl: '#/management/kibana/dataViews/dataView/1',
        inAppUrl: {
          path: '/management/kibana/dataViews/dataView/1',
          uiCapabilitiesPath: 'management.kibana.indexPatterns',
        },
      },
    },
  ],
  allowedTypes: [
    { name: 'index-pattern', displayName: 'index-pattern', hidden: false, namespaceType: 'single' },
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
  sort: {
    field: 'updated_at',
    direction: 'desc',
  },
  items: [
    {
      id: '1',
      type: 'index-pattern',
      attributes: {},
      references: [],
      meta: {
        title: `MyIndexPattern*`,
        icon: 'indexPatternApp',
        editUrl: '#/management/kibana/dataViews/dataView/1',
        inAppUrl: {
          path: '/management/kibana/dataViews/dataView/1',
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
  capabilities: { savedObjectsManagement: { delete: true } } as any,
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

  it(`prevents hidden saved objects from being deleted`, () => {
    const selectedSavedObjects = [
      { type: 'visualization', meta: { hiddenType: true } },
      { type: 'search', meta: { hiddenType: true } },
      { type: 'index-pattern', meta: { hiddenType: true } },
    ] as any;
    const customizedProps = {
      ...defaultProps,
      selectedSavedObjects,
      capabilities: { savedObjectsManagement: { delete: false } } as any,
    };
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
        setActionContext: () => null,
      } as any,
    ]);
    const onActionRefresh = jest.fn();
    const customizedProps = { ...defaultProps, actionRegistry, onActionRefresh };
    const component = shallowWithI18nProvider(<Table {...customizedProps} />);

    const table = component.find('EuiBasicTable');
    const columns = table.prop('columns') as any[];
    const actionColumn = columns.find((x) => Object.hasOwn(x, 'actions')) as { actions: any[] };
    const someAction = actionColumn.actions.find(
      (x) => x['data-test-subj'] === 'savedObjectsTableAction-someAction'
    );

    expect(onActionRefresh).not.toHaveBeenCalled();
    someAction.onClick();
    expect(onActionRefresh).toHaveBeenCalled();
  });

  describe('hidden SOs', () => {
    it('keeps the delete button disabled for hidden SOs', async () => {
      const hiddenSavedObjects = [
        { type: 'visualization', managed: false, meta: { hiddenType: true } },
        { type: 'search', managed: false, meta: { hiddenType: true } },
        { type: 'index-pattern', managed: false, meta: { hiddenType: true } },
      ] as any;

      render(
        <I18nProvider>
          <Table {...defaultProps} selectedSavedObjects={hiddenSavedObjects} />
        </I18nProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('savedObjectsManagementDelete')).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Export' })).toBeEnabled();
      });
    });

    it('enables the delete button when the selection contains at least one non-hidden SO', async () => {
      const selectedSavedObjects = [
        { type: 'visualization', meta: { hiddenType: true } },
        { type: 'search', meta: { hiddenType: true } },
        { type: 'index-pattern', meta: { hiddenType: true } },
        { type: 'lens', meta: { hiddenType: false } }, // deletable!
      ] as any;

      render(
        <I18nProvider>
          <Table {...defaultProps} selectedSavedObjects={selectedSavedObjects} />
        </I18nProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('savedObjectsManagementDelete')).toBeEnabled();
        expect(screen.getByRole('button', { name: 'Export' })).toBeEnabled();
      });
    });
  });
});
