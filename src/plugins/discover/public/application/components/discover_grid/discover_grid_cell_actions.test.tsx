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
