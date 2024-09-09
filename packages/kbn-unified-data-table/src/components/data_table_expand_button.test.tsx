/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { findTestSubject } from '@elastic/eui/lib/test';
import { ExpandButton } from './data_table_expand_button';
import { UnifiedDataTableContext } from '../table_context';
import { dataTableContextMock } from '../../__mocks__/table_context';

describe('Data table view button ', function () {
  it('when no document is expanded, setExpanded is called with current document', async () => {
    const contextMock = {
      ...dataTableContextMock,
    };

    const component = mountWithIntl(
      <UnifiedDataTableContext.Provider value={contextMock}>
        <ExpandButton
          rowIndex={0}
          colIndex={0}
          setCellProps={jest.fn()}
          columnId="test"
          isExpanded={false}
          isDetails={false}
          isExpandable={false}
        />
      </UnifiedDataTableContext.Provider>
    );
    const button = findTestSubject(component, 'docTableExpandToggleColumn');
    await button.simulate('click');
    expect(contextMock.setExpanded).toHaveBeenCalledWith(dataTableContextMock.rows[0]);
  });
  it('when the current document is expanded, setExpanded is called with undefined', async () => {
    const contextMock = {
      ...dataTableContextMock,
      expanded: dataTableContextMock.rows[0],
    };

    const component = mountWithIntl(
      <UnifiedDataTableContext.Provider value={contextMock}>
        <ExpandButton
          rowIndex={0}
          colIndex={0}
          setCellProps={jest.fn()}
          columnId="test"
          isExpanded={false}
          isDetails={false}
          isExpandable={false}
        />
      </UnifiedDataTableContext.Provider>
    );
    const button = findTestSubject(component, 'docTableExpandToggleColumn');
    await button.simulate('click');
    expect(contextMock.setExpanded).toHaveBeenCalledWith(undefined);
  });
  it('when another document is expanded, setExpanded is called with the current document', async () => {
    const contextMock = {
      ...dataTableContextMock,
      expanded: dataTableContextMock.rows[0],
    };

    const component = mountWithIntl(
      <UnifiedDataTableContext.Provider value={contextMock}>
        <ExpandButton
          rowIndex={1}
          colIndex={0}
          setCellProps={jest.fn()}
          columnId="test"
          isExpanded={false}
          isDetails={false}
          isExpandable={false}
        />
      </UnifiedDataTableContext.Provider>
    );
    const button = findTestSubject(component, 'docTableExpandToggleColumn');
    await button.simulate('click');
    expect(contextMock.setExpanded).toHaveBeenCalledWith(dataTableContextMock.rows[1]);
  });
});
