/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiHeader } from '@elastic/eui';
import { applicationServiceMock } from '@kbn/core-application-browser-mocks';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import * as Rx from 'rxjs';
import { ProjectHeader, Props as ProjectHeaderProps } from './header';

const mockApplication = applicationServiceMock.createInternalStartContract();

describe('Header', () => {
  const mockProps: Omit<ProjectHeaderProps, 'children'> = {
    application: mockApplication,
    kibanaDocLink: 'app/help/doclinks',
    kibanaVersion: '8.9',
    actionMenu$: Rx.of(),
    breadcrumbs$: Rx.of([]),
    globalHelpExtensionMenuLinks$: Rx.of([]),
    headerBanner$: Rx.of(),
    helpExtension$: Rx.of(),
    helpSupportUrl$: Rx.of('app/help'),
    homeHref$: Rx.of('app/home'),
    loadingCount$: Rx.of(0),
    navControlsCenter$: Rx.of([]),
    navControlsLeft$: Rx.of([]),
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

      expect(screen.queryAllByText('Hello, goodbye!')).toHaveLength(0); // title is not shown

      fireEvent.click(await screen.findByTestId('toggleNavButton')); // click again

      expect(await screen.findByText('Hello, goodbye!')).toBeVisible(); // title is shown
    };

    await toggleNav();
    await toggleNav();
    await toggleNav();
  });
});
