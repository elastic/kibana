/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { of } from 'rxjs';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import { spacesPluginMock } from '@kbn/spaces-plugin/public/mocks';
import { createDiscoverServicesMock } from '../../../../__mocks__/services';
import type { ActiveSolution } from './get_active_solution_profile';
import { SolutionProfileBadge } from './solution_profile_badge';

// EUI appends visually-hidden "(opens in a new tab…)" text to external links, so match by substring.
const TURN_OFF_LINK = /Turn off in Advanced Settings/;
const CONTACT_ADMIN = 'Contact your administrator to turn off contextual profiles.';
const DESCRIPTION = 'Discover adapted this view to your data.';
const ACTIVE_SPACE = {
  id: 'my-space',
  name: 'My space',
  disabledFeatures: [],
  solution: 'classic',
};

const renderBadge = ({
  activeSolution = 'observability' as ActiveSolution,
  canEditAdvancedSettings = true,
  canManageSpaces = true,
  withSpaces = true,
} = {}) => {
  const services = createDiscoverServicesMock();
  services.capabilities.advancedSettings = {
    ...services.capabilities.advancedSettings,
    save: canEditAdvancedSettings,
  };
  services.capabilities.spaces = { ...services.capabilities.spaces, manage: canManageSpaces };
  services.addBasePath = jest.fn((path: string) => path);

  if (withSpaces) {
    const spaces = spacesPluginMock.createStartContract();
    spaces.getActiveSpace$.mockReturnValue(of(ACTIVE_SPACE));
    services.spaces = spaces;
  } else {
    services.spaces = undefined;
  }

  render(
    <I18nProvider>
      <SolutionProfileBadge services={services} activeSolution={activeSolution} />
    </I18nProvider>
  );
  return services;
};

const openPopover = () =>
  userEvent.click(screen.getByRole('button', { name: /Click to learn more/ }));

describe('SolutionProfileBadge', () => {
  it('renders the named solution as the badge label', () => {
    renderBadge({ activeSolution: 'security' });
    expect(screen.getByText('Security view')).toBeVisible();
  });

  it('explains the adaptation in a popover when clicked', async () => {
    renderBadge({ activeSolution: 'observability' });

    await openPopover();

    // The popover panel is transform-positioned, so `toBeVisible` is unreliable in jsdom.
    expect(await screen.findByText(DESCRIPTION)).toBeInTheDocument();
  });

  it('promotes switching to the matching solution view when the user can manage spaces', async () => {
    renderBadge({ activeSolution: 'security', canManageSpaces: true, withSpaces: true });

    await openPopover();

    expect(await screen.findByRole('link', { name: /Security view/ })).toHaveAttribute(
      'href',
      '/app/management/kibana/spaces/edit/my-space'
    );
  });

  it('asks the user to contact an admin to switch when they cannot manage spaces', async () => {
    renderBadge({ activeSolution: 'observability', canManageSpaces: false, withSpaces: true });

    await openPopover();

    expect(
      await screen.findByText(/ask your administrator to switch your space/i)
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Observability view/ })).not.toBeInTheDocument();
  });

  it('omits the switch prompt when Spaces is unavailable', async () => {
    renderBadge({ withSpaces: false });

    await openPopover();

    expect(await screen.findByText(DESCRIPTION)).toBeInTheDocument();
    expect(screen.queryByText(/switch your space/i)).not.toBeInTheDocument();
  });

  it('links to Advanced Settings when the user can edit them', async () => {
    renderBadge({ canEditAdvancedSettings: true });

    await openPopover();

    expect(await screen.findByRole('link', { name: TURN_OFF_LINK })).toHaveAttribute(
      'href',
      '/app/management/kibana/settings?query=discover:enableSolutionProfilesInClassic'
    );
    expect(screen.queryByText(CONTACT_ADMIN)).not.toBeInTheDocument();
  });

  it('asks the user to contact an admin when they cannot edit settings', async () => {
    renderBadge({ canEditAdvancedSettings: false });

    await openPopover();

    expect(await screen.findByText(CONTACT_ADMIN)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: TURN_OFF_LINK })).not.toBeInTheDocument();
  });
});
