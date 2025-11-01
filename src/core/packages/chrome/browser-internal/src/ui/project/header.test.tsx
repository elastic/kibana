/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiHeader } from '@elastic/eui';
import { applicationServiceMock } from '@kbn/core-application-browser-mocks';
import { docLinksServiceMock } from '@kbn/core-doc-links-browser-mocks';
import { render, screen } from '@testing-library/react';
import React from 'react';
import * as Rx from 'rxjs';
import type { Props as ProjectHeaderProps } from './header';
import { ProjectHeader } from './header';
import { uiSettingsServiceMock } from '@kbn/core-ui-settings-browser-mocks';

const mockApplication = applicationServiceMock.createInternalStartContract();

describe('Header', () => {
  const mockProps: Omit<ProjectHeaderProps, 'children'> = {
    application: mockApplication,
    breadcrumbs$: Rx.of([]),
    breadcrumbsAppendExtensions$: Rx.of([]),
    actionMenu$: Rx.of(undefined),
    docLinks: docLinksServiceMock.createStartContract(),
    globalHelpExtensionMenuLinks$: Rx.of([]),
    headerBanner$: Rx.of(),
    helpExtension$: Rx.of(undefined),
    helpSupportUrl$: Rx.of('app/help'),
    helpMenuLinks$: Rx.of([]),
    homeHref$: Rx.of('app/home'),
    kibanaVersion: '8.9',
    loadingCount$: Rx.of(0),
    navControlsLeft$: Rx.of([]),
    navControlsCenter$: Rx.of([]),
    navControlsRight$: Rx.of([]),
    customBranding$: Rx.of({}),
    prependBasePath: (str) => `hello/world/${str}`,
    isServerless: false,
    uiSettings: uiSettingsServiceMock.createStartContract(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders', async () => {
    render(
      <ProjectHeader {...mockProps}>
        <EuiHeader>Hello, world!</EuiHeader>
      </ProjectHeader>
    );

    expect(await screen.findByText('Hello, world!')).toBeVisible();
    expect(screen.queryByTestId(/customLogo/)).toBeNull();
  });

  it('renders custom branding logo', async () => {
    const { queryByTestId } = render(
      <ProjectHeader {...mockProps} customBranding$={Rx.of({ logo: 'foo.jpg' })}>
        <EuiHeader>Hello, world!</EuiHeader>
      </ProjectHeader>
    );

    expect(queryByTestId(/customLogo/)).not.toBeNull();
  });

  it('creates home href based on "defaultRoute" uiSetting correctly', async () => {
    (mockProps.uiSettings.get as jest.Mock).mockReturnValue('custom/route');

    render(
      <ProjectHeader {...mockProps}>
        <EuiHeader>Hello, world!</EuiHeader>
      </ProjectHeader>
    );

    const logo = screen.getByTestId('globalLoadingIndicator-hidden');
    expect(logo).toBeInTheDocument();

    const logoHref = logo.getAttribute('href');
    expect(logoHref).toBe('hello/world/custom/route');
  });

  it('creates home href correctly when "defaultRoute" uiSetting is undefined', async () => {
    (mockProps.uiSettings.get as jest.Mock).mockReturnValue(undefined);

    render(
      <ProjectHeader {...mockProps}>
        <EuiHeader>Hello, world!</EuiHeader>
      </ProjectHeader>
    );

    const logo = screen.getByTestId('globalLoadingIndicator-hidden');
    expect(logo).toBeInTheDocument();

    const logoHref = logo.getAttribute('href');
    expect(logoHref).toBe('hello/world/app/home');
  });
});
