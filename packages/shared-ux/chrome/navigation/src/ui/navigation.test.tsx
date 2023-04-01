/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { render } from 'react-dom';
import { getServicesMock } from '../../mocks/src/jest';
import { NavigationProvider } from '../services';
import { Navigation } from './navigation';

describe('<Navigation />', () => {
  test('renders with minimal props', () => {
    const div = document.createElement('div');
    const { getLocator } = getServicesMock();

    const recentItems = [{ label: 'This is a test', id: 'test', link: 'legendOfZelda' }];
    const platformSections = {};
    const solutions = [
      {
        id: 'navigation_testing',
        name: 'Navigation testing',
        icon: 'gear',
      },
    ];

    render(
      <NavigationProvider getLocator={getLocator} navIsOpen={true} recentItems={recentItems}>
        <Navigation platformConfig={platformSections} solutions={solutions} />
      </NavigationProvider>,
      div
    );
  });
});
