/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import './setup_jest_mocks';
import React from 'react';
import { type RenderResult } from '@testing-library/react';

import { Navigation } from '../src/ui/components/navigation';
import type { RootNavigationItemDefinition } from '../src/ui/types';

import {
  renderNavigation,
  errorHandler,
  TestType,
  getMockFn,
  ProjectNavigationChangeListener,
} from './utils';

describe('Panel', () => {
  test('should render group as panel opener', async () => {
    const onProjectNavigationChange = getMockFn<ProjectNavigationChangeListener>();

    const runTests = async (type: TestType, { findByTestId, queryByTestId }: RenderResult) => {
      try {
        expect(await findByTestId(/panelOpener-root.group1/)).toBeVisible();
        expect(queryByTestId(/sideNavPanel/)).toBeNull();
        (await findByTestId(/panelOpener-root.group1/)).click(); // open the panel
        expect(queryByTestId(/sideNavPanel/)).toBeVisible();

        expect(onProjectNavigationChange).toHaveBeenCalled();
        const lastCall =
          onProjectNavigationChange.mock.calls[onProjectNavigationChange.mock.calls.length - 1];
        const [{ navigationTree }] = lastCall;

        const [root] = navigationTree;
        expect(root.id).toBe('root');
        expect(root.children?.[0]).toMatchObject({
          id: 'group1',
          renderAs: 'panelOpener',
          children: [
            {
              id: 'management',
              title: 'Deeplink management',
            },
          ],
        });
      } catch (e) {
        errorHandler(type)(e);
      }
    };

    // -- Default navigation
    {
      const navigationBody: RootNavigationItemDefinition[] = [
        {
          type: 'navGroup',
          id: 'root',
          isCollapsible: false,
          children: [
            {
              id: 'group1',
              link: 'dashboards',
              renderAs: 'panelOpener',
              children: [{ link: 'management' }],
            },
          ],
        },
      ];

      const renderResult = renderNavigation({
        navTreeDef: { body: navigationBody },
        onProjectNavigationChange,
      });

      await runTests('treeDef', renderResult);

      renderResult.unmount();
    }

    // -- With UI Components
    {
      const renderResult = renderNavigation({
        navigationElement: (
          <Navigation>
            <Navigation.Group id="root" isCollapsible={false}>
              <Navigation.Group id="group1" link="dashboards" renderAs="panelOpener">
                <Navigation.Item link="management" />
              </Navigation.Group>
            </Navigation.Group>
          </Navigation>
        ),
        onProjectNavigationChange,
      });
      await runTests('uiComponents', renderResult);
    }
  });
});
