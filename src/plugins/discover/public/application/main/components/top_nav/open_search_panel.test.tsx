/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { OpenSearchPanel } from './open_search_panel';

jest.mock('../../../../utils/use_discover_services', () => {
  const defaults = {
    core: { uiSettings: {}, savedObjects: {} },
    addBasePath: (path: string) => path,
  };
  let testNumber = 0;
  return {
    useDiscoverServices: () => {
      testNumber++;

      if (testNumber === 2) {
        return {
          ...defaults,
          capabilities: {
            savedObjectsManagement: {
              edit: false,
              delete: false,
            },
          },
        };
      }

      return {
        ...defaults,
        capabilities: {
          savedObjectsManagement: {
            edit: true,
          },
        },
      };
    },
  };
});

describe('OpenSearchPanel', () => {
  test('render', () => {
    const component = shallow(
      <OpenSearchPanel onClose={jest.fn()} onOpenSavedSearch={jest.fn()} />
    );
    expect(component).toMatchSnapshot();
  });

  test('should not render manage searches button without permissions', () => {
    const component = shallow(
      <OpenSearchPanel onClose={jest.fn()} onOpenSavedSearch={jest.fn()} />
    );
    expect(component.find('[data-test-subj="manageSearches"]').exists()).toBe(false);
  });
});
