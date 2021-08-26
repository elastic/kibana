/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test/jest';
import { findTestSubject } from '@elastic/eui/lib/test';
import { getServices } from '../../../../../kibana_services';

jest.mock('../../../../../kibana_services', () => {
  const mockUiSettings = new Map();
  return {
    getServices: () => ({
      core: {
        uiSettings: {
          get: (key: string) => {
            return mockUiSettings.get(key);
          },
          set: (key: string, value: boolean) => {
            mockUiSettings.set(key, value);
          },
        },
      },
      addBasePath: (path: string) => path,
    }),
  };
});

import { OptionsPopover } from './open_options_popover';

test('should display the correct text if datagrid is selected', () => {
  const element = document.createElement('div');
  const component = mountWithIntl(<OptionsPopover onClose={jest.fn()} anchorElement={element} />);
  expect(findTestSubject(component, 'docTableMode').text()).toBe('New table');
});

test('should display the correct text if legacy table is selected', () => {
  const {
    core: { uiSettings },
  } = getServices();
  uiSettings.set('doc_table:legacy', true);
  const element = document.createElement('div');
  const component = mountWithIntl(<OptionsPopover onClose={jest.fn()} anchorElement={element} />);
  expect(findTestSubject(component, 'docTableMode').text()).toBe('Classic table');
});
