/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import { createDiscoverServicesMock } from '../../../../__mocks__/services';
import type { ActiveSolution } from './get_active_solution_profile';
import { SolutionProfileBadge } from './solution_profile_badge';

// EUI appends visually-hidden "(opens in a new tab…)" text to external links, so match by substring.
const TURN_OFF_LINK = /Turn off in Advanced Settings/;
const CONTACT_ADMIN = 'Contact your administrator to turn off contextual profiles.';

const renderBadge = ({
  activeSolution = 'observability' as ActiveSolution,
  canEditAdvancedSettings = true,
} = {}) => {
  const services = createDiscoverServicesMock();
  services.capabilities.advancedSettings = {
    ...services.capabilities.advancedSettings,
    save: canEditAdvancedSettings,
  };
  services.addBasePath = jest.fn((path: string) => path);
  render(
    <I18nProvider>
      <SolutionProfileBadge services={services} activeSolution={activeSolution} />
    </I18nProvider>
  );
  return services;
};

describe('SolutionProfileBadge', () => {
  it('renders the named solution as the badge label', () => {
    renderBadge({ activeSolution: 'security' });
    expect(screen.getByText('Security view')).toBeVisible();
  });

  it('explains the adaptation in a popover when clicked', async () => {
    renderBadge({ activeSolution: 'observability' });

    await userEvent.click(screen.getByText('Observability view'));

    // The popover panel is transform-positioned, so `toBeVisible` is unreliable in jsdom.
    expect(await screen.findByText(/Discover detected this data/)).toBeInTheDocument();
  });

  it('links to Advanced Settings when the user can edit them', async () => {
    renderBadge({ canEditAdvancedSettings: true });

    await userEvent.click(screen.getByText('Observability view'));

    expect(await screen.findByRole('link', { name: TURN_OFF_LINK })).toHaveAttribute(
      'href',
      '/app/management/kibana/settings?query=discover:enableSolutionProfilesInClassic'
    );
    expect(screen.queryByText(CONTACT_ADMIN)).not.toBeInTheDocument();
  });

  it('asks the user to contact an admin when they cannot edit settings', async () => {
    renderBadge({ canEditAdvancedSettings: false });

    await userEvent.click(screen.getByText('Observability view'));

    expect(await screen.findByText(CONTACT_ADMIN)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: TURN_OFF_LINK })).not.toBeInTheDocument();
  });
});
