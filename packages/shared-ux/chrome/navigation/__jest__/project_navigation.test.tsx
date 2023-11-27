/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import './setup_jest_mocks';
import { of } from 'rxjs';
import type { ChromeNavLink } from '@kbn/core-chrome-browser';

import { navLinksMock } from '../mocks/src/navlinks';
import { NavigationServices } from '../types';
import type { ProjectNavigationTreeDefinition } from '../src/ui/types';
import { getMockFn, renderNavigation, type ProjectNavigationChangeListener } from './utils';

describe('Default navigation', () => {
  /**
   * INFO: the navigation system support providing "just" the serverless project navigation and we
   * render all the rest (other sections, footer, recently accessed...)
   * For now, none of the serverless project uses this feature as they all have completely different navs
   */
  test('builds the full navigation tree when only the project is provided', async () => {
    const onProjectNavigationChange = getMockFn<ProjectNavigationChangeListener>();
    const deepLinks$: NavigationServices['deepLinks$'] = of({
      ...navLinksMock.reduce<Record<string, ChromeNavLink>>((acc, navLink) => {
        acc[navLink.id] = navLink;
        return acc;
      }, {}),
      item2: {
        id: 'item2',
        title: 'Title from deeplink!',
        baseUrl: '',
        url: '',
        href: '',
      },
    });

    const projectNavigationTree: ProjectNavigationTreeDefinition<any> = [
      {
        id: 'group1',
        title: 'Group 1',
        children: [
          {
            id: 'item1',
            title: 'Item 1',
          },
          {
            id: 'item2',
            link: 'item2', // Title from deeplink
          },
          {
            id: 'item3',
            link: 'item2',
            title: 'Deeplink title overriden', // Override title from deeplink
          },
          {
            link: 'disabled',
            title: 'Should NOT be there',
          },
        ],
      },
    ];

    renderNavigation({
      projectNavigationTree,
      onProjectNavigationChange,
      services: { deepLinks$ },
    });

    expect(onProjectNavigationChange).toHaveBeenCalled();
    const lastCall =
      onProjectNavigationChange.mock.calls[onProjectNavigationChange.mock.calls.length - 1];
    const [navTreeGenerated] = lastCall;

    expect(navTreeGenerated).toEqual({
      navigationTree: expect.any(Array),
    });

    // The project navigation tree passed
    expect(navTreeGenerated.navigationTree).toMatchSnapshot();
  });
});
