/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { History } from 'history';
import { firstValueFrom, lastValueFrom, take } from 'rxjs';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { applicationServiceMock } from '@kbn/core-application-browser-mocks';
import type { ChromeNavLinks } from '@kbn/core-chrome-browser';
import { ProjectNavigationService } from './project_navigation_service';

const createHistoryMock = ({
  locationPathName = '/',
}: { locationPathName?: string } = {}): jest.Mocked<History> => {
  return {
    block: jest.fn(),
    createHref: jest.fn(),
    go: jest.fn(),
    goBack: jest.fn(),
    goForward: jest.fn(),
    listen: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
    action: 'PUSH',
    length: 1,
    location: {
      pathname: locationPathName,
      search: '',
      hash: '',
      key: '',
      state: undefined,
    },
  };
};

const setup = ({ locationPathName = '/' }: { locationPathName?: string } = {}) => {
  const projectNavigationService = new ProjectNavigationService();
  const projectNavigation = projectNavigationService.start({
    application: {
      ...applicationServiceMock.createInternalStartContract(),
      history: createHistoryMock({ locationPathName }),
    },
    navLinks: {} as unknown as ChromeNavLinks,
    http: httpServiceMock.createStartContract(),
  });

  return { projectNavigation };
};

describe('breadcrumbs', () => {
  test('should return list of breadcrumbs home / nav / custom', async () => {
    const { projectNavigation } = setup();

    projectNavigation.setProjectBreadcrumbs([
      { text: 'custom1', href: '/custom1' },
      { text: 'custom2', href: '/custom1/custom2' },
    ]);

    // TODO: add projectNavigation.setProjectNavigation() to test the part of breadcrumbs extracted from the nav tree

    const breadcrumbs = await firstValueFrom(projectNavigation.getProjectBreadcrumbs$());
    expect(breadcrumbs).toMatchInlineSnapshot(`
      Array [
        Object {
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

  test('should skip the default navigation from project navigation when absolute: true is used', async () => {
    const { projectNavigation } = setup();

    projectNavigation.setProjectBreadcrumbs(
      [
        { text: 'custom1', href: '/custom1' },
        { text: 'custom2', href: '/custom1/custom2' },
      ],
      { absolute: true }
    );

    // TODO: add projectNavigation.setProjectNavigation() to test the part of breadcrumbs extracted from the nav tree

    const breadcrumbs = await firstValueFrom(projectNavigation.getProjectBreadcrumbs$());
    expect(breadcrumbs).toMatchInlineSnapshot(`
      Array [
        Object {
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
