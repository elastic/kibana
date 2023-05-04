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

import { OptionsPopover } from './open_options_popover';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';

test('should display the correct text if datagrid is selected', () => {
  const element = document.createElement('div');
  const component = mountWithIntl(
    <KibanaContextProvider
      services={{ addBasePath: () => '', core: { uiSettings: { get: () => false } } }}
    >
      <OptionsPopover onClose={jest.fn()} anchorElement={element} />
    </KibanaContextProvider>
  );
  expect(findTestSubject(component, 'docTableMode').text()).toBe('Document Explorer');
});

test('should display the correct text if legacy table is selected', () => {
  const element = document.createElement('div');
  const component = mountWithIntl(
    <KibanaContextProvider
      services={{ addBasePath: () => '', core: { uiSettings: { get: () => true } } }}
    >
      <OptionsPopover onClose={jest.fn()} anchorElement={element} />
    </KibanaContextProvider>
  );
  expect(findTestSubject(component, 'docTableMode').text()).toBe('Classic');
});
