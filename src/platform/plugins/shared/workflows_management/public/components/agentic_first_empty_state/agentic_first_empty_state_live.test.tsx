/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { AgenticFirstEmptyStateLive, pickRandom } from './agentic_first_empty_state_live';

const mockNavigateToApp = jest.fn();
const mockGetAgentBuilderAccess = jest.fn();
let mockHasShowPrivilege = true;
let mockHasAgentBuilder = true;

jest.mock('../../hooks/use_kibana', () => ({
  useKibana: () => ({
    services: {
      application: {
        navigateToApp: mockNavigateToApp,
        capabilities: { agentBuilder: { show: mockHasShowPrivilege } },
      },
      docLinks: { links: { agentBuilder: { models: 'https://docs.example/models' } } },
      workflowsManagement: {
        agentBuilder: mockHasAgentBuilder
          ? {
              getAgentBuilderAccess: mockGetAgentBuilderAccess,
              EmbeddableConversationInput: () => <div data-test-subj="mockConversationInput" />,
            }
          : undefined,
      },
    },
  }),
}));

let mockLibraryEnabled = false;
let mockTemplates: Array<Record<string, unknown>> = [];

jest.mock('@kbn/workflows-ui', () => ({
  ...jest.requireActual('@kbn/workflows-ui'),
  useLibraryEnabled: () => mockLibraryEnabled,
  useCatalog: () => ({ templates: mockTemplates }),
}));

const makeTemplate = (slug: string) => ({
  slug,
  name: `Template ${slug}`,
  description: '',
  stepTypes: [],
  triggerTypes: [],
  categories: [],
});

const renderLive = () =>
  render(
    <I18nProvider>
      <AgenticFirstEmptyStateLive />
    </I18nProvider>
  );

describe('AgenticFirstEmptyStateLive', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHasShowPrivilege = true;
    mockHasAgentBuilder = true;
    mockLibraryEnabled = false;
    mockTemplates = [];
  });

  const expectNoPrompt = () => {
    expect(screen.queryByTestId('agenticFirstAgentInput')).not.toBeInTheDocument();
    expect(screen.queryByTestId('agenticFirstConnectLlmPanel')).not.toBeInTheDocument();
    expect(screen.getByTestId('agenticFirstStartManuallyButton')).toBeInTheDocument();
  };

  it('shows the chat input when an LLM connector exists', async () => {
    mockGetAgentBuilderAccess.mockResolvedValue({
      hasRequiredLicense: true,
      hasLlmConnector: true,
    });

    renderLive();

    await waitFor(() => expect(mockGetAgentBuilderAccess).toHaveBeenCalled());
    expect(screen.getByTestId('mockConversationInput')).toBeInTheDocument();
    expect(screen.queryByTestId('agenticFirstConnectLlmPanel')).not.toBeInTheDocument();
  });

  it('hides the templates row when the library is disabled', async () => {
    mockGetAgentBuilderAccess.mockResolvedValue({
      hasRequiredLicense: true,
      hasLlmConnector: true,
    });

    renderLive();

    await waitFor(() => expect(mockGetAgentBuilderAccess).toHaveBeenCalled());
    expect(screen.queryByTestId('agenticFirstExploreLibraryLink')).not.toBeInTheDocument();
    expect(screen.getByTestId('agenticFirstStartManuallyButton')).toBeInTheDocument();
    expect(screen.getByTestId('agenticFirstExampleWorkflowsLink')).toHaveAttribute(
      'href',
      'https://github.com/elastic/workflows'
    );
  });

  it('replaces the chat input with the connect-LLM panel when no connector exists', async () => {
    mockGetAgentBuilderAccess.mockResolvedValue({
      hasRequiredLicense: true,
      hasLlmConnector: false,
    });

    renderLive();

    expect(await screen.findByTestId('agenticFirstConnectLlmPanel')).toBeInTheDocument();
    expect(screen.queryByTestId('mockConversationInput')).not.toBeInTheDocument();
    expect(screen.getByTestId('agenticFirstConnectLlmDocsLink')).toHaveAttribute(
      'href',
      'https://docs.example/models'
    );

    fireEvent.click(screen.getByTestId('agenticFirstConnectLlmButton'));
    expect(mockNavigateToApp).toHaveBeenCalledWith('management', {
      path: '/modelManagement/model_settings',
    });
  });

  it('hides the prompt when the license is missing', async () => {
    mockGetAgentBuilderAccess.mockResolvedValue({
      hasRequiredLicense: false,
      hasLlmConnector: true,
    });

    renderLive();

    await waitFor(() =>
      expect(screen.queryByTestId('mockConversationInput')).not.toBeInTheDocument()
    );
    expectNoPrompt();
  });

  it('hides the prompt without the Agent Builder show privilege', () => {
    mockHasShowPrivilege = false;

    renderLive();

    expectNoPrompt();
    expect(mockGetAgentBuilderAccess).not.toHaveBeenCalled();
  });

  it('hides the prompt when Agent Builder is disabled', () => {
    mockHasAgentBuilder = false;

    renderLive();

    expectNoPrompt();
  });

  it('shows 3 random library templates and keeps them across catalog refetches', async () => {
    mockGetAgentBuilderAccess.mockResolvedValue({
      hasRequiredLicense: true,
      hasLlmConnector: true,
    });
    mockLibraryEnabled = true;
    mockTemplates = ['a', 'b', 'c', 'd', 'e'].map(makeTemplate);
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.99);

    const { rerender } = renderLive();
    await waitFor(() => expect(mockGetAgentBuilderAccess).toHaveBeenCalled());

    const shownSlugs = () =>
      screen
        .getAllByTestId(/^workflow-library-template-card-/)
        .map((card) => card.getAttribute('data-test-subj'));
    const firstPick = shownSlugs();
    expect(firstPick).toEqual([
      'workflow-library-template-card-e',
      'workflow-library-template-card-a',
      'workflow-library-template-card-b',
    ]);

    // A refetch returns a new array; the pick must not change.
    randomSpy.mockReturnValue(0);
    mockTemplates = [...mockTemplates];
    rerender(
      <I18nProvider>
        <AgenticFirstEmptyStateLive />
      </I18nProvider>
    );
    expect(shownSlugs()).toEqual(firstPick);
    randomSpy.mockRestore();
  });
});

describe('pickRandom', () => {
  it('returns the requested number of distinct items', () => {
    const picked = pickRandom([1, 2, 3, 4, 5], 3);
    expect(picked).toHaveLength(3);
    expect(new Set(picked).size).toBe(3);
  });

  it('returns every item when there are fewer than requested', () => {
    expect(pickRandom([1, 2], 3).sort()).toEqual([1, 2]);
  });
});
