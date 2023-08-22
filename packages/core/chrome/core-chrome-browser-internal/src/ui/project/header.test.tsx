/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiHeader } from '@elastic/eui';
import { applicationServiceMock } from '@kbn/core-application-browser-mocks';
import { docLinksServiceMock } from '@kbn/core-doc-links-browser-mocks';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import * as Rx from 'rxjs';
import { ProjectHeader, Props as ProjectHeaderProps } from './header';

const mockApplication = applicationServiceMock.createInternalStartContract();

describe('Header', () => {
  const mockProps: Omit<ProjectHeaderProps, 'children'> = {
    application: mockApplication,
    breadcrumbs$: Rx.of([]),
    actionMenu$: Rx.of(undefined),
    docLinks: docLinksServiceMock.createStartContract(),
    globalHelpExtensionMenuLinks$: Rx.of([]),
    headerBanner$: Rx.of(),
    helpExtension$: Rx.of(undefined),
    helpSupportUrl$: Rx.of('app/help'),
    helpMenuLinks$: Rx.of([]),
    homeHref$: Rx.of('app/home'),
    projectsUrl$: Rx.of('/projects/'),
    kibanaVersion: '8.9',
    loadingCount$: Rx.of(0),
    navControlsLeft$: Rx.of([]),
    navControlsCenter$: Rx.of([]),
    navControlsRight$: Rx.of([]),
    prependBasePath: (str) => `hello/world/${str}`,
  };

  it('renders', async () => {
    render(
      <ProjectHeader {...mockProps}>
        <EuiHeader>Hello, world!</EuiHeader>
      </ProjectHeader>
    );

    expect(await screen.findByTestId('toggleNavButton')).toBeVisible();
    expect(await screen.findByText('Hello, world!')).toBeVisible();
  });

  it('can collapse and uncollapse', async () => {
    render(
      <ProjectHeader {...mockProps}>
        <EuiHeader>Hello, goodbye!</EuiHeader>
      </ProjectHeader>
    );

    expect(await screen.findByTestId('toggleNavButton')).toBeVisible();
    expect(await screen.findByText('Hello, goodbye!')).toBeVisible(); // title is shown

    const toggleNav = async () => {
      fireEvent.click(await screen.findByTestId('toggleNavButton')); // click

      expect(await screen.findByText('Hello, goodbye!')).not.toBeVisible();

      fireEvent.click(await screen.findByTestId('toggleNavButton')); // click again

      expect(await screen.findByText('Hello, goodbye!')).toBeVisible(); // title is shown
    };

    await toggleNav();
    await toggleNav();
    await toggleNav();
  });

  it('displays the link to projects', async () => {
    render(
      <ProjectHeader {...mockProps}>
        <EuiHeader>Hello, world!</EuiHeader>
      </ProjectHeader>
    );

    const projectsLink = await screen.getByTestId('projectsLink');
    expect(projectsLink).toHaveAttribute('href', '/projects/');
  });
});
