/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createMemoryHistory } from 'history';
import { firstValueFrom, lastValueFrom, take } from 'rxjs';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { applicationServiceMock } from '@kbn/core-application-browser-mocks';
import type { ChromeNavLinks } from '@kbn/core-chrome-browser';
import { ProjectNavigationService } from './project_navigation_service';

const setup = ({ locationPathName = '/' }: { locationPathName?: string } = {}) => {
  const projectNavigationService = new ProjectNavigationService();
  const history = createMemoryHistory();
  history.replace(locationPathName);
  const projectNavigation = projectNavigationService.start({
    application: {
      ...applicationServiceMock.createInternalStartContract(),
      history,
    },
    navLinks: {} as unknown as ChromeNavLinks,
    http: httpServiceMock.createStartContract(),
  });

  return { projectNavigation, history };
};

describe('breadcrumbs', () => {
  const setupWithNavTree = () => {
    const currentLocationPathName = '/foo/item1';
    const { projectNavigation, history } = setup({ locationPathName: currentLocationPathName });

    const mockNavigation = {
      navigationTree: [
        {
          id: 'root',
          title: 'Root',
          path: ['root'],
          breadcrumbStatus: 'hidden' as 'hidden',
          children: [
            {
              id: 'subNav',
              path: ['root', 'subNav'],
              title: '', // intentionally empty to skip rendering
              children: [
                {
                  id: 'navItem1',
                  title: 'Nav Item 1',
                  path: ['root', 'subNav', 'navItem1'],
                  deepLink: {
                    id: 'navItem1',
                    title: 'Nav Item 1',
                    url: '/foo/item1',
                    baseUrl: '',
                    href: '/foo/item1',
                  },
                },
              ],
            },
          ],
        },
      ],
    };
    projectNavigation.setProjectNavigation(mockNavigation);
    return { projectNavigation, history, mockNavigation };
  };

  test('should set breadcrumbs home / nav / custom', async () => {
    const { projectNavigation } = setupWithNavTree();

    projectNavigation.setProjectBreadcrumbs([
      { text: 'custom1', href: '/custom1' },
      { text: 'custom2', href: '/custom1/custom2' },
    ]);

    const breadcrumbs = await firstValueFrom(projectNavigation.getProjectBreadcrumbs$());
    expect(breadcrumbs).toMatchInlineSnapshot(`
      Array [
        Object {
          "data-test-subj": "breadcrumb-home",
          "href": "/",
          "text": <EuiIcon
            type="home"
          />,
          "title": "Home",
        },
        Object {
          "data-test-subj": "breadcrumb-deepLinkId-navItem1",
          "href": "/foo/item1",
          "text": "Nav Item 1",
        },
        Object {
          "href": "/custom1",
          "text": "custom1",
        },
        Object {
          "href": "/custom1/custom2",
          "text": "custom2",
        },
      ]
    `);
  });

  test('should skip the default navigation from project navigation when absolute: true is used', async () => {
    const { projectNavigation } = setupWithNavTree();

    projectNavigation.setProjectBreadcrumbs(
      [
        { text: 'custom1', href: '/custom1' },
        { text: 'custom2', href: '/custom1/custom2' },
      ],
      { absolute: true }
    );

    const breadcrumbs = await firstValueFrom(projectNavigation.getProjectBreadcrumbs$());
    expect(breadcrumbs).toMatchInlineSnapshot(`
      Array [
        Object {
          "data-test-subj": "breadcrumb-home",
          "href": "/",
          "text": <EuiIcon
            type="home"
          />,
          "title": "Home",
        },
        Object {
          "href": "/custom1",
          "text": "custom1",
        },
        Object {
          "href": "/custom1/custom2",
          "text": "custom2",
        },
      ]
    `);
  });

  test('should reset custom breadcrumbs when active path changes', async () => {
    const { projectNavigation, history } = setupWithNavTree();
    projectNavigation.setProjectBreadcrumbs([
      { text: 'custom1', href: '/custom1' },
      { text: 'custom2', href: '/custom1/custom2' },
    ]);

    let breadcrumbs = await firstValueFrom(projectNavigation.getProjectBreadcrumbs$());
    expect(breadcrumbs).toHaveLength(4);
    history.push('/foo/item2');
    breadcrumbs = await firstValueFrom(projectNavigation.getProjectBreadcrumbs$());
    expect(breadcrumbs).toHaveLength(1); // only home is left
  });

  // this handles race condition where the final `setProjectNavigation` update happens after the app called `setProjectBreadcrumbs`
  test("shouldn't reset initial deep context breadcrumbs", async () => {
    const { projectNavigation, mockNavigation } = setupWithNavTree();
    projectNavigation.setProjectNavigation({ navigationTree: [] }); // reset simulating initial state
    projectNavigation.setProjectBreadcrumbs([
      { text: 'custom1', href: '/custom1' },
      { text: 'custom2', href: '/custom1/custom2' },
    ]);
    projectNavigation.setProjectNavigation(mockNavigation); // restore navigation

    const breadcrumbs = await firstValueFrom(projectNavigation.getProjectBreadcrumbs$());
    expect(breadcrumbs).toHaveLength(4);
  });

  test("shouldn't reset custom breadcrumbs when nav node contents changes, but not the path", async () => {
    const { projectNavigation, mockNavigation } = setupWithNavTree();
    projectNavigation.setProjectBreadcrumbs([
      { text: 'custom1', href: '/custom1' },
      { text: 'custom2', href: '/custom1/custom2' },
    ]);
    let breadcrumbs = await firstValueFrom(projectNavigation.getProjectBreadcrumbs$());
    expect(breadcrumbs).toHaveLength(4);

    // navigation node contents changed, but not the path
    projectNavigation.setProjectNavigation({
      navigationTree: [
        { ...mockNavigation.navigationTree[0], title: 'Changed title' },
        ...mockNavigation.navigationTree,
      ],
    });

    // context breadcrumbs should not reset
    breadcrumbs = await firstValueFrom(projectNavigation.getProjectBreadcrumbs$());
    expect(breadcrumbs).toHaveLength(4);
  });
});

describe('getActiveNodes$()', () => {
  test('should set the active nodes from history location', async () => {
    const currentLocationPathName = '/foo/item1';
    const { projectNavigation } = setup({ locationPathName: currentLocationPathName });

    let activeNodes = await lastValueFrom(projectNavigation.getActiveNodes$().pipe(take(1)));
    expect(activeNodes).toEqual([]);

    projectNavigation.setProjectNavigation({
      navigationTree: [
        {
          id: 'root',
          title: 'Root',
          path: ['root'],
          children: [
            {
              id: 'item1',
              title: 'Item 1',
              path: ['root', 'item1'],
              deepLink: {
                id: 'item1',
                title: 'Item 1',
                url: '/foo/item1',
                baseUrl: '',
                href: '',
              },
            },
          ],
        },
      ],
    });

    activeNodes = await lastValueFrom(projectNavigation.getActiveNodes$().pipe(take(1)));

    expect(activeNodes).toEqual([
      [
        {
          id: 'root',
          title: 'Root',
          isActive: true,
          path: ['root'],
        },
        {
          id: 'item1',
          title: 'Item 1',
          isActive: true,
          path: ['root', 'item1'],
          deepLink: {
            id: 'item1',
            title: 'Item 1',
            url: '/foo/item1',
            baseUrl: '',
            href: '',
          },
        },
      ],
    ]);
  });

  test('should set the active nodes from getIsActive() handler', async () => {
    const { projectNavigation } = setup();

    let activeNodes = await lastValueFrom(projectNavigation.getActiveNodes$().pipe(take(1)));
    expect(activeNodes).toEqual([]);

    projectNavigation.setProjectNavigation({
      navigationTree: [
        {
          id: 'root',
          title: 'Root',
          path: ['root'],
          children: [
            {
              id: 'item1',
              title: 'Item 1',
              path: ['root', 'item1'],
              getIsActive: () => true,
            },
          ],
        },
      ],
    });

    activeNodes = await lastValueFrom(projectNavigation.getActiveNodes$().pipe(take(1)));

    expect(activeNodes).toEqual([
      [
        {
          id: 'root',
          title: 'Root',
          isActive: true,
          path: ['root'],
        },
        {
          id: 'item1',
          title: 'Item 1',
          isActive: true,
          path: ['root', 'item1'],
          getIsActive: expect.any(Function),
        },
      ],
    ]);
  });
});
