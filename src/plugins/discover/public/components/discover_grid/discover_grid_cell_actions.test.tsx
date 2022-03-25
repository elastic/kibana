/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { findTestSubject } from '@elastic/eui/lib/test';
import { FilterInBtn, FilterOutBtn, buildCellActions } from './discover_grid_cell_actions';
import { DiscoverGridContext } from './discover_grid_context';

import { indexPatternMock } from '../../__mocks__/index_pattern';
import { esHits } from '../../__mocks__/es_hits';
import { EuiButton } from '@elastic/eui';
import { DataViewField } from 'src/plugins/data_views/public';

describe('Discover cell actions ', function () {
  it('should not show cell actions for unfilterable fields', async () => {
    expect(buildCellActions({ name: 'foo', filterable: false } as DataViewField)).toBeUndefined();
  });

  it('triggers filter function when FilterInBtn is clicked', async () => {
    const contextMock = {
      expanded: undefined,
      setExpanded: jest.fn(),
      rows: esHits,
      onFilter: jest.fn(),
      indexPattern: indexPatternMock,
      isDarkMode: false,
      selectedDocs: [],
      setSelectedDocs: jest.fn(),
    };

    const component = mountWithIntl(
      <DiscoverGridContext.Provider value={contextMock}>
        <FilterInBtn
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          Component={(props: any) => <EuiButton {...props} />}
          rowIndex={1}
          colIndex={1}
          columnId="extension"
          isExpanded={false}
          closePopover={jest.fn()}
        />
      </DiscoverGridContext.Provider>
    );
    const button = findTestSubject(component, 'filterForButton');
    await button.simulate('click');
    expect(contextMock.onFilter).toHaveBeenCalledWith('extension', 'jpg', '+');
  });
  it('triggers filter function when FilterOutBtn is clicked', async () => {
    const contextMock = {
      expanded: undefined,
      setExpanded: jest.fn(),
      rows: esHits,
      onFilter: jest.fn(),
      indexPattern: indexPatternMock,
      isDarkMode: false,
      selectedDocs: [],
      setSelectedDocs: jest.fn(),
    };

    const component = mountWithIntl(
      <DiscoverGridContext.Provider value={contextMock}>
        <FilterOutBtn
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          Component={(props: any) => <EuiButton {...props} />}
          rowIndex={1}
          colIndex={1}
          columnId="extension"
          isExpanded={false}
          closePopover={jest.fn()}
        />
      </DiscoverGridContext.Provider>
    );
    const button = findTestSubject(component, 'filterOutButton');
    await button.simulate('click');
    expect(contextMock.onFilter).toHaveBeenCalledWith('extension', 'jpg', '-');
  });
});
