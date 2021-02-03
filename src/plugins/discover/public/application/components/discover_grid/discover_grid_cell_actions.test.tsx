/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test/jest';
import { findTestSubject } from '@elastic/eui/lib/test';
import { FilterInBtn, FilterOutBtn } from './discover_grid_cell_actions';
import { DiscoverGridContext } from './discover_grid_context';

import { indexPatternMock } from '../../../__mocks__/index_pattern';
import { esHits } from '../../../__mocks__/es_hits';
import { EuiButton } from '@elastic/eui';

describe('Discover cell actions ', function () {
  it('triggers filter function when FilterInBtn is clicked', async () => {
    const contextMock = {
      expanded: undefined,
      setExpanded: jest.fn(),
      rows: esHits,
      onFilter: jest.fn(),
      indexPattern: indexPatternMock,
      isDarkMode: false,
    };

    const component = mountWithIntl(
      <DiscoverGridContext.Provider value={contextMock}>
        <FilterInBtn
          Component={(props: any) => <EuiButton {...props} />}
          rowIndex={1}
          columnId={'extension'}
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
    };

    const component = mountWithIntl(
      <DiscoverGridContext.Provider value={contextMock}>
        <FilterOutBtn
          Component={(props: any) => <EuiButton {...props} />}
          rowIndex={1}
          columnId={'extension'}
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
