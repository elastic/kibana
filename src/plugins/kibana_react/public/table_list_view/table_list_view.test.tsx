/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiEmptyPrompt } from '@elastic/eui';
import { shallowWithIntl } from '@kbn/test-jest-helpers';
import { ToastsStart } from 'kibana/public';
import React from 'react';
import { themeServiceMock, applicationServiceMock } from '../../../../../src/core/public/mocks';
import { TableListView } from './table_list_view';

const requiredProps = {
  entityName: 'test',
  entityNamePlural: 'tests',
  listingLimit: 5,
  initialFilter: '',
  initialPageSize: 5,
  tableColumns: [],
  tableListTitle: 'test title',
  rowHeader: 'name',
  tableCaption: 'test caption',
  toastNotifications: {} as ToastsStart,
  findItems: jest.fn(() => Promise.resolve({ total: 0, hits: [] })),
  theme: themeServiceMock.createStartContract(),
  application: applicationServiceMock.createStartContract(),
};

describe('TableListView', () => {
  test('render default empty prompt', async () => {
    const component = shallowWithIntl(<TableListView {...requiredProps} />);

    // Using setState to check the final render while sidestepping the debounced promise management
    component.setState({
      hasInitialFetchReturned: true,
      isFetchingItems: false,
    });

    expect(component).toMatchSnapshot();
  });

  // avoid trapping users in empty prompt that can not create new items
  test('render default empty prompt with create action when createItem supplied', async () => {
    const component = shallowWithIntl(<TableListView {...requiredProps} createItem={() => {}} />);

    // Using setState to check the final render while sidestepping the debounced promise management
    component.setState({
      hasInitialFetchReturned: true,
      isFetchingItems: false,
    });

    expect(component).toMatchSnapshot();
  });

  test('render custom empty prompt', () => {
    const component = shallowWithIntl(
      <TableListView {...requiredProps} emptyPrompt={<EuiEmptyPrompt />} />
    );

    // Using setState to check the final render while sidestepping the debounced promise management
    component.setState({
      hasInitialFetchReturned: true,
      isFetchingItems: false,
    });

    expect(component).toMatchSnapshot();
  });

  test('render list view', () => {
    const component = shallowWithIntl(<TableListView {...requiredProps} />);

    // Using setState to check the final render while sidestepping the debounced promise management
    component.setState({
      hasInitialFetchReturned: true,
      isFetchingItems: false,
      items: [{}],
    });

    expect(component).toMatchSnapshot();
  });
});
