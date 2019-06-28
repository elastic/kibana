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
import { shallowWithIntl, mountWithIntl } from 'test_utils/enzyme_helpers';
import { findTestSubject } from '@elastic/eui/lib/test';
import { keyCodes } from '@elastic/eui/lib/services';

jest.mock('ui/kfetch', () => ({ kfetch: jest.fn() }));

jest.mock('ui/errors', () => ({
  SavedObjectNotFound: class SavedObjectNotFound extends Error {
    constructor(options) {
      super();
      for (const option in options) {
        if (options.hasOwnProperty(option)) {
          this[option] = options[option];
        }
      }
    }
  },
}));

jest.mock('ui/chrome', () => ({
  addBasePath: () => ''
}));

import { Table } from '../table';

const defaultProps = {
  selectedSavedObjects: [{
    id: '1',
    type: 'index-pattern',
    meta: {
      title: `MyIndexPattern*`,
      icon: 'indexPatternApp',
      editUrl: '#/management/kibana/index_patterns/1',
      inAppUrl: {
        path: '/management/kibana/index_patterns/1',
        uiCapabilitiesPath: 'management.kibana.index_patterns',
      },
    },
  }],
  selectionConfig: {
    onSelectionChange: () => {},
  },
  filterOptions: [{ value: 2 }],
  onDelete: () => {},
  onExport: () => {},
  goInspectObject: () => {},
  canGoInApp: () => {},
  pageIndex: 1,
  pageSize: 2,
  items: [{
    id: '1',
    type: 'index-pattern',
    meta: {
      title: `MyIndexPattern*`,
      icon: 'indexPatternApp',
      editUrl: '#/management/kibana/index_patterns/1',
      inAppUrl: {
        path: '/management/kibana/index_patterns/1',
        uiCapabilitiesPath: 'management.kibana.index_patterns',
      },
    },
  }],
  itemId: 'id',
  totalItemCount: 3,
  onQueryChange: () => {},
  onTableChange: () => {},
  isSearching: false,
  onShowRelationships: () => {},
  canDelete: true
};

describe('Table', () => {
  it('should render normally', () => {
    const component = shallowWithIntl(
      <Table.WrappedComponent
        {...defaultProps}
      />
    );

    expect(component).toMatchSnapshot();
  });

  it('should handle query parse error', () => {
    const onQueryChangeMock = jest.fn();
    const customizedProps = {
      ...defaultProps,
      onQueryChange: onQueryChangeMock
    };

    const component = mountWithIntl(
      <Table.WrappedComponent
        {...customizedProps}
      />
    );
    const searchBar = findTestSubject(component, 'savedObjectSearchBar');

    // Send invalid query
    searchBar.simulate('keyup', { keyCode: keyCodes.ENTER, target: { value: '?' } });
    expect(onQueryChangeMock).toHaveBeenCalledTimes(0);
    expect(component.state().isSearchTextValid).toBe(false);

    onQueryChangeMock.mockReset();

    // Send valid query to ensure component can recover from invalid query
    searchBar.simulate('keyup', { keyCode: keyCodes.ENTER, target: { value: 'I am valid' } });
    expect(onQueryChangeMock).toHaveBeenCalledTimes(1);
    expect(component.state().isSearchTextValid).toBe(true);
  });

  it(`prevents saved objects from being deleted`, () => {
    const selectedSavedObjects = [{ type: 'visualization' }, { type: 'search' }, { type: 'index-pattern' }];
    const customizedProps = { ...defaultProps, selectedSavedObjects, canDelete: false };
    const component = shallowWithIntl(
      <Table.WrappedComponent
        {...customizedProps}
      />
    );

    expect(component).toMatchSnapshot();
  });
});
