/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallow } from 'enzyme';

const mockCapabilities = jest.fn().mockReturnValue({
  savedObjectsManagement: {
    edit: true,
  },
});

jest.mock('../../../../../kibana_services', () => {
  return {
    getServices: () => ({
      core: { uiSettings: {}, savedObjects: {} },
      addBasePath: (path: string) => path,
      capabilities: mockCapabilities(),
    }),
  };
});

import { OpenSearchPanel } from './open_search_panel';

describe('OpenSearchPanel', () => {
  test('render', () => {
    const component = shallow(
      <OpenSearchPanel onClose={jest.fn()} onOpenSavedSearch={jest.fn()} />
    );
    expect(component).toMatchSnapshot();
  });

  test('should not render manage searches button without permissions', () => {
    mockCapabilities.mockReturnValue({
      savedObjectsManagement: {
        edit: false,
        delete: false,
      },
    });
    const component = shallow(
      <OpenSearchPanel onClose={jest.fn()} onOpenSavedSearch={jest.fn()} />
    );
    expect(component.find('[data-test-subj="manageSearches"]').exists()).toBe(false);
  });
});
