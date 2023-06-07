/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { firstValueFrom } from 'rxjs';
import { ProjectNavigationService } from './project_navigation_service';
import { applicationServiceMock } from '@kbn/core-application-browser-mocks';
import type { ChromeNavLinks } from '@kbn/core-chrome-browser';

const setup = () => {
  const projectNavigationService = new ProjectNavigationService();
  const projectNavigation = projectNavigationService.start({
    application: applicationServiceMock.createInternalStartContract(),
    navLinks: {} as unknown as ChromeNavLinks,
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
