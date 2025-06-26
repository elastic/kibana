/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { shallow } from 'enzyme';

describe('OpenSearchPanel', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test('render', async () => {
    jest.doMock('../../../../hooks/use_discover_services', () => ({
      useDiscoverServices: jest.fn().mockImplementation(() => ({
        addBasePath: (path: string) => path,
        capabilities: { savedObjectsManagement: { edit: true } },
        savedObjectsFinder: { Finder: jest.fn() },
        core: {},
      })),
    }));
    const { OpenSearchPanel } = await import('./open_search_panel');

    const component = shallow(
      <OpenSearchPanel onClose={jest.fn()} onOpenSavedSearch={jest.fn()} />
    );
    expect(component).toMatchSnapshot();
  });

  test('should not render manage searches button without permissions', async () => {
    jest.doMock('../../../../hooks/use_discover_services', () => ({
      useDiscoverServices: jest.fn().mockImplementation(() => ({
        addBasePath: (path: string) => path,
        capabilities: { savedObjectsManagement: { edit: false, delete: false } },
        savedObjectsFinder: { Finder: jest.fn() },
        core: {},
      })),
    }));
    const { OpenSearchPanel } = await import('./open_search_panel');

    const component = shallow(
      <OpenSearchPanel onClose={jest.fn()} onOpenSavedSearch={jest.fn()} />
    );
    expect(component.find('[data-test-subj="manageSearches"]').exists()).toBe(false);
  });
});
