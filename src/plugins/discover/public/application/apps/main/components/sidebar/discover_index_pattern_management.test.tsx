/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test/jest';
import { EuiContextMenuPanel, EuiPopover, EuiContextMenuItem } from '@elastic/eui';
import { findTestSubject } from '@kbn/test/jest';
import { DiscoverServices } from '../../../../../build_services';
import { DiscoverIndexPatternManagement } from './discover_index_pattern_management';
import { stubLogstashIndexPattern } from '../../../../../../../data/common/stubs';

const mockServices = {
  history: () => ({
    location: {
      search: '',
    },
  }),
  capabilities: {
    visualize: {
      show: true,
    },
    discover: {
      save: false,
    },
  },
  core: {
    application: {
      navigateToApp: jest.fn(),
    },
  },
  uiSettings: {
    get: (key: string) => {
      if (key === 'fields:popularLimit') {
        return 5;
      }
    },
  },
  indexPatternFieldEditor: {
    openEditor: jest.fn(),
    userPermissions: {
      editIndexPattern: () => {
        return true;
      },
    },
  },
} as unknown as DiscoverServices;

describe('Discover IndexPattern Management', () => {
  const indexPattern = stubLogstashIndexPattern;

  const editField = jest.fn();

  const mountComponent = () => {
    return mountWithIntl(
      <DiscoverIndexPatternManagement
        services={mockServices}
        editField={editField}
        selectedIndexPattern={indexPattern}
        useNewFieldsApi={true}
      />
    );
  };

  test('renders correctly', () => {
    const component = mountComponent();
    expect(component).toMatchSnapshot();
    expect(component.find(EuiPopover).length).toBe(1);
  });

  test('click on a button opens popover', () => {
    const component = mountComponent();
    expect(component.find(EuiContextMenuPanel).length).toBe(0);

    const button = findTestSubject(component, 'discoverIndexPatternActions');
    button.simulate('click');

    expect(component.find(EuiContextMenuPanel).length).toBe(1);
    expect(component.find(EuiContextMenuItem).length).toBe(2);
  });

  test('click on an add button executes editField callback', () => {
    const component = mountComponent();
    const button = findTestSubject(component, 'discoverIndexPatternActions');
    button.simulate('click');

    const addButton = findTestSubject(component, 'indexPattern-add-field');
    addButton.simulate('click');
    expect(editField).toHaveBeenCalledWith(undefined);
  });

  test('click on a manage button navigates away from discover', () => {
    const component = mountComponent();
    const button = findTestSubject(component, 'discoverIndexPatternActions');
    button.simulate('click');

    const manageButton = findTestSubject(component, 'indexPattern-manage-field');
    manageButton.simulate('click');
    expect(mockServices.core.application.navigateToApp).toHaveBeenCalled();
  });
});
