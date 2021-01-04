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
import { ExpandButton } from './discover_grid_expand_button';
import { DiscoverGridContext } from './discover_grid_context';
import { indexPatternMock } from '../../../__mocks__/index_pattern';
import { esHits } from '../../../__mocks__/es_hits';

describe('Discover grid view button ', function () {
  it('when no document is expanded, setExpanded is called with current document', async () => {
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
        <ExpandButton
          rowIndex={0}
          setCellProps={jest.fn()}
          columnId="test"
          isExpanded={false}
          isDetails={false}
          isExpandable={false}
        />
      </DiscoverGridContext.Provider>
    );
    const button = findTestSubject(component, 'docTableExpandToggleColumn');
    await button.simulate('click');
    expect(contextMock.setExpanded).toHaveBeenCalledWith(esHits[0]);
  });
  it('when the current document is expanded, setExpanded is called with undefined', async () => {
    const contextMock = {
      expanded: esHits[0],
      setExpanded: jest.fn(),
      rows: esHits,
      onFilter: jest.fn(),
      indexPattern: indexPatternMock,
      isDarkMode: false,
    };

    const component = mountWithIntl(
      <DiscoverGridContext.Provider value={contextMock}>
        <ExpandButton
          rowIndex={0}
          setCellProps={jest.fn()}
          columnId="test"
          isExpanded={false}
          isDetails={false}
          isExpandable={false}
        />
      </DiscoverGridContext.Provider>
    );
    const button = findTestSubject(component, 'docTableExpandToggleColumn');
    await button.simulate('click');
    expect(contextMock.setExpanded).toHaveBeenCalledWith(undefined);
  });
  it('when another document is expanded, setExpanded is called with the current document', async () => {
    const contextMock = {
      expanded: esHits[0],
      setExpanded: jest.fn(),
      rows: esHits,
      onFilter: jest.fn(),
      indexPattern: indexPatternMock,
      isDarkMode: false,
    };

    const component = mountWithIntl(
      <DiscoverGridContext.Provider value={contextMock}>
        <ExpandButton
          rowIndex={1}
          setCellProps={jest.fn()}
          columnId="test"
          isExpanded={false}
          isDetails={false}
          isExpandable={false}
        />
      </DiscoverGridContext.Provider>
    );
    const button = findTestSubject(component, 'docTableExpandToggleColumn');
    await button.simulate('click');
    expect(contextMock.setExpanded).toHaveBeenCalledWith(esHits[1]);
  });
});
