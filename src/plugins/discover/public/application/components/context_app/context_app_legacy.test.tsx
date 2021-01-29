/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { ContextAppLegacy } from './context_app_legacy';
import { IIndexPattern } from '../../../../../data/common/index_patterns';
import { mountWithIntl } from '@kbn/test/jest';
import { DocTableLegacy } from '../../angular/doc_table/create_doc_table_react';
import { findTestSubject } from '@elastic/eui/lib/test';
import { ActionBar } from '../../angular/context/components/action_bar/action_bar';
import { ContextErrorMessage } from '../context_error_message';
import { TopNavMenuMock } from './__mocks__/top_nav_menu';

describe('ContextAppLegacy test', () => {
  const hit = {
    _id: '123',
    _index: 'test_index',
    _score: null,
    _version: 1,
    _source: {
      category: ["Men's Clothing"],
      currency: 'EUR',
      customer_first_name: 'Walker',
      customer_full_name: 'Walker Texas Ranger',
      customer_gender: 'MALE',
      customer_last_name: 'Ranger',
    },
    fields: [{ order_date: ['2020-10-19T13:35:02.000Z'] }],
    sort: [1603114502000, 2092],
  };
  const indexPattern = {
    id: 'test_index_pattern',
  } as IIndexPattern;
  const defaultProps = {
    columns: ['_source'],
    filter: () => {},
    hits: [hit],
    sorting: ['order_date', 'desc'],
    minimumVisibleRows: 5,
    indexPattern,
    status: 'loaded',
    reason: 'no reason',
    defaultStepSize: 5,
    predecessorCount: 10,
    successorCount: 10,
    predecessorAvailable: 10,
    successorAvailable: 10,
    onChangePredecessorCount: jest.fn(),
    onChangeSuccessorCount: jest.fn(),
    predecessorStatus: 'loaded',
    successorStatus: 'loaded',
    topNavMenu: TopNavMenuMock,
  };
  const topNavProps = {
    appName: 'context',
    showSearchBar: true,
    showQueryBar: false,
    showFilterBar: true,
    showSaveQuery: false,
    showDatePicker: false,
    indexPatterns: [indexPattern],
    useDefaultBehaviors: true,
  };

  it('renders correctly', () => {
    const component = mountWithIntl(<ContextAppLegacy {...defaultProps} />);
    expect(component.find(DocTableLegacy).length).toBe(1);
    const loadingIndicator = findTestSubject(component, 'contextApp_loadingIndicator');
    expect(loadingIndicator.length).toBe(0);
    expect(component.find(ActionBar).length).toBe(2);
    const topNavMenu = component.find(TopNavMenuMock);
    expect(topNavMenu.length).toBe(1);
    expect(topNavMenu.props()).toStrictEqual(topNavProps);
  });

  it('renders loading indicator', () => {
    const props = { ...defaultProps };
    props.status = 'loading';
    const component = mountWithIntl(<ContextAppLegacy {...props} />);
    expect(component.find(DocTableLegacy).length).toBe(0);
    const loadingIndicator = findTestSubject(component, 'contextApp_loadingIndicator');
    expect(loadingIndicator.length).toBe(1);
    expect(component.find(ActionBar).length).toBe(2);
    expect(component.find(TopNavMenuMock).length).toBe(1);
  });

  it('renders error message', () => {
    const props = { ...defaultProps };
    props.status = 'failed';
    props.reason = 'something went wrong';
    const component = mountWithIntl(<ContextAppLegacy {...props} />);
    expect(component.find(DocTableLegacy).length).toBe(0);
    expect(component.find(TopNavMenuMock).length).toBe(0);
    const errorMessage = component.find(ContextErrorMessage);
    expect(errorMessage.length).toBe(1);
  });
});
