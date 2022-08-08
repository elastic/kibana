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
import { ExpandButton } from './discover_grid_expand_button';
import { DiscoverGridContext } from './discover_grid_context';
import { discoverGridContextMock } from '../../__mocks__/grid_context';

describe('Discover grid view button ', function () {
  it('when no document is expanded, setExpanded is called with current document', async () => {
    const contextMock = {
      ...discoverGridContextMock,
    };

    const component = mountWithIntl(
      <DiscoverGridContext.Provider value={contextMock}>
        <ExpandButton
          rowIndex={0}
          colIndex={0}
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
    expect(contextMock.setExpanded).toHaveBeenCalledWith(discoverGridContextMock.rows[0]);
  });
  it('when the current document is expanded, setExpanded is called with undefined', async () => {
    const contextMock = {
      ...discoverGridContextMock,
      expanded: discoverGridContextMock.rows[0],
    };

    const component = mountWithIntl(
      <DiscoverGridContext.Provider value={contextMock}>
        <ExpandButton
          rowIndex={0}
          colIndex={0}
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
      ...discoverGridContextMock,
      expanded: discoverGridContextMock.rows[0],
    };

    const component = mountWithIntl(
      <DiscoverGridContext.Provider value={contextMock}>
        <ExpandButton
          rowIndex={1}
          colIndex={0}
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
    expect(contextMock.setExpanded).toHaveBeenCalledWith(discoverGridContextMock.rows[1]);
  });
});
