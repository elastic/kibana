/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import type { DiscoverSession } from '@kbn/saved-search-plugin/common';
import { createDiscoverSessionMock } from '@kbn/saved-search-plugin/common/mocks';
import { createDiscoverServicesMock } from '../../../../__mocks__/services';
import { getDiscoverInternalStateMock } from '../../../../__mocks__/discover_state.mock';
import { DiscoverTestProvider } from '../../../../__mocks__/test_provider';
import { ChromeAppHeader } from './chrome_app_header';

const savedSession = createDiscoverSessionMock({ id: 'test-session', title: 'My session' });

const setup = async ({
  persistedDiscoverSession,
  canSave = true,
  isEmbeddedEditor = false,
}: {
  persistedDiscoverSession: DiscoverSession | undefined;
  canSave?: boolean;
  isEmbeddedEditor?: boolean;
}) => {
  const services = createDiscoverServicesMock();
  services.capabilities = { ...services.capabilities, discover_v2: { save: canSave } };
  jest.mocked(services.chrome.getChromeStyle).mockReturnValue('project');
  jest.mocked(services.embeddableEditor.isEmbeddedEditor).mockReturnValue(isEmbeddedEditor);

  const toolkit = getDiscoverInternalStateMock({ services, persistedDataViews: [dataViewMock] });
  await toolkit.initializeTabs({ persistedDiscoverSession });

  if (persistedDiscoverSession) {
    // Renaming loads the latest saved version, which is the opened one here
    jest
      .mocked(services.discoverSessionService.get)
      .mockResolvedValue({ session: persistedDiscoverSession, warnings: [] });
  }

  render(
    <DiscoverTestProvider
      services={services}
      internalState={toolkit.internalState}
      runtimeStateManager={toolkit.runtimeStateManager}
    >
      <ChromeAppHeader />
    </DiscoverTestProvider>
  );

  return { services, toolkit, user: userEvent.setup() };
};

const renameFromHeader = async (user: ReturnType<typeof userEvent.setup>, newTitle: string) => {
  await user.click(screen.getByTestId('appHeaderTitleButton'));
  const input = screen.getByRole('textbox', { name: 'Edit Discover session name' });
  await user.clear(input);
  await user.type(input, `${newTitle}{Enter}`);
};

describe('ChromeAppHeader', () => {
  it('should rename a saved session from the header title', async () => {
    const { services, toolkit, user } = await setup({ persistedDiscoverSession: savedSession });

    await renameFromHeader(user, 'Renamed session');

    await waitFor(() => {
      expect(screen.getByTestId('appHeaderTitle')).toHaveTextContent('Renamed session');
    });
    expect(screen.queryByTestId('appHeaderTitleInput')).not.toBeInTheDocument();
    expect(services.discoverSessionService.save).toHaveBeenCalledTimes(1);
    expect(toolkit.internalState.getState().persistedDiscoverSession?.title).toBe(
      'Renamed session'
    );
  });

  it('should keep the new name as a draft for a session that has never been saved', async () => {
    const { services, toolkit, user } = await setup({ persistedDiscoverSession: undefined });

    expect(screen.getByTestId('appHeaderTitle')).toHaveTextContent('New session');

    await renameFromHeader(user, 'My draft');

    await waitFor(() => {
      expect(screen.getByTestId('appHeaderTitle')).toHaveTextContent('My draft');
    });
    expect(services.discoverSessionService.save).not.toHaveBeenCalled();
    expect(toolkit.internalState.getState().draftSessionTitle).toBe('My draft');
  });

  it('should keep the editor open with an error when renaming fails', async () => {
    const { services, user } = await setup({ persistedDiscoverSession: savedSession });
    jest
      .mocked(services.discoverSessionService.save)
      .mockRejectedValueOnce(new Error('Save failed'));

    await renameFromHeader(user, 'Renamed session');

    expect(await screen.findByTestId('appHeaderTitleError')).toHaveTextContent(
      'Unable to rename Discover session'
    );
    expect(screen.getByTestId('appHeaderTitleInput')).toBeVisible();
  });

  it.each([
    {
      scenario: 'the session is managed',
      options: { persistedDiscoverSession: { ...savedSession, managed: true } },
      expectedTitle: 'My session',
    },
    {
      scenario: 'the user cannot save Discover sessions',
      options: { persistedDiscoverSession: savedSession, canSave: false },
      expectedTitle: 'My session',
    },
    {
      scenario: 'the session is edited from a dashboard',
      options: { persistedDiscoverSession: savedSession, isEmbeddedEditor: true },
      expectedTitle: 'My session',
    },
  ])('should not allow renaming when $scenario', async ({ options, expectedTitle }) => {
    await setup(options);

    expect(screen.getByTestId('appHeaderTitle')).toHaveTextContent(expectedTitle);
    expect(screen.queryByTestId('appHeaderTitleButton')).not.toBeInTheDocument();
  });
});
