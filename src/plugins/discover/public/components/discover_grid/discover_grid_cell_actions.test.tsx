/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
const mockCopyToClipboard = jest.fn((value) => true);
jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    copyToClipboard: (value: string) => mockCopyToClipboard(value),
  };
});

jest.mock('../../hooks/use_discover_services', () => {
  const services = {
    toastNotifications: {
      addInfo: jest.fn(),
    },
  };
  const originalModule = jest.requireActual('../../hooks/use_discover_services');
  return {
    ...originalModule,
    useDiscoverServices: () => services,
  };
});

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { findTestSubject } from '@elastic/eui/lib/test';
import { FilterInBtn, FilterOutBtn, buildCellActions, CopyBtn } from './discover_grid_cell_actions';
import { DiscoverGridContext } from './discover_grid_context';
import { EuiButton } from '@elastic/eui';
import { discoverGridContextMock } from '../../__mocks__/grid_context';
import { DataViewField } from '@kbn/data-views-plugin/public';

describe('Discover cell actions ', function () {
  it('should not show cell actions for unfilterable fields', async () => {
    expect(buildCellActions({ name: 'foo', filterable: false } as DataViewField)).toEqual([
      CopyBtn,
    ]);
  });

  it('should show filter actions for filterable fields', async () => {
    expect(buildCellActions({ name: 'foo', filterable: true } as DataViewField, jest.fn())).toEqual(
      [FilterInBtn, FilterOutBtn, CopyBtn]
    );
  });

  it('should show Copy action for _source field', async () => {
    expect(
      buildCellActions({ name: '_source', type: '_source', filterable: false } as DataViewField)
    ).toEqual([CopyBtn]);
  });

  it('triggers filter function when FilterInBtn is clicked', async () => {
    const component = mountWithIntl(
      <DiscoverGridContext.Provider value={discoverGridContextMock}>
        <FilterInBtn
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          Component={(props: any) => <EuiButton {...props} />}
          rowIndex={1}
          colIndex={1}
          columnId="extension"
          isExpanded={false}
        />
      </DiscoverGridContext.Provider>
    );
    const button = findTestSubject(component, 'filterForButton');
    await button.simulate('click');
    expect(discoverGridContextMock.onFilter).toHaveBeenCalledWith(
      discoverGridContextMock.dataView.fields.getByName('extension'),
      'jpg',
      '+'
    );
  });
  it('triggers filter function when FilterInBtn is clicked for a non-provided value', async () => {
    const component = mountWithIntl(
      <DiscoverGridContext.Provider value={discoverGridContextMock}>
        <FilterInBtn
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          Component={(props: any) => <EuiButton {...props} />}
          rowIndex={0}
          colIndex={1}
          columnId="extension"
          isExpanded={false}
        />
      </DiscoverGridContext.Provider>
    );
    const button = findTestSubject(component, 'filterForButton');
    await button.simulate('click');
    expect(discoverGridContextMock.onFilter).toHaveBeenCalledWith(
      discoverGridContextMock.dataView.fields.getByName('extension'),
      undefined,
      '+'
    );
  });
  it('triggers filter function when FilterInBtn is clicked for an empty string value', async () => {
    const component = mountWithIntl(
      <DiscoverGridContext.Provider value={discoverGridContextMock}>
        <FilterInBtn
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          Component={(props: any) => <EuiButton {...props} />}
          rowIndex={4}
          colIndex={1}
          columnId="message"
          isExpanded={false}
        />
      </DiscoverGridContext.Provider>
    );
    const button = findTestSubject(component, 'filterForButton');
    await button.simulate('click');
    expect(discoverGridContextMock.onFilter).toHaveBeenCalledWith(
      discoverGridContextMock.dataView.fields.getByName('message'),
      '',
      '+'
    );
  });
  it('triggers filter function when FilterOutBtn is clicked', async () => {
    const component = mountWithIntl(
      <DiscoverGridContext.Provider value={discoverGridContextMock}>
        <FilterOutBtn
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          Component={(props: any) => <EuiButton {...props} />}
          rowIndex={1}
          colIndex={1}
          columnId="extension"
          isExpanded={false}
        />
      </DiscoverGridContext.Provider>
    );
    const button = findTestSubject(component, 'filterOutButton');
    await button.simulate('click');
    expect(discoverGridContextMock.onFilter).toHaveBeenCalledWith(
      discoverGridContextMock.dataView.fields.getByName('extension'),
      'jpg',
      '-'
    );
  });
  it('triggers clipboard copy when CopyBtn is clicked', async () => {
    const component = mountWithIntl(
      <DiscoverGridContext.Provider value={discoverGridContextMock}>
        <CopyBtn
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          Component={(props: any) => <EuiButton {...props} />}
          rowIndex={1}
          colIndex={1}
          columnId="extension"
          isExpanded={false}
        />
      </DiscoverGridContext.Provider>
    );
    const button = findTestSubject(component, 'copyClipboardButton');
    await button.simulate('click');
    expect(mockCopyToClipboard).toHaveBeenCalledWith('jpg');
  });
});
