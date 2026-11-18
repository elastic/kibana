/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { AgenticFirstEmptyStateLive } from './agentic_first_empty_state_live';
import { AUTO_MIGRATION_HREF } from './auto_migration_panel';

const mockNavigateToApp = jest.fn();
const mockGetAgentBuilderAccess = jest.fn();
let mockHasShowPrivilege = true;
let mockHasAgentBuilder = true;

jest.mock('../../hooks/use_kibana', () => ({
  useKibana: () => ({
    services: {
      application: {
        navigateToApp: mockNavigateToApp,
        getUrlForApp: (appId: string, options?: { deepLinkId?: string; path?: string }) =>
          `/app/${appId}/${options?.deepLinkId ?? ''}${options?.path ?? ''}`,
        capabilities: { agentBuilder: { show: mockHasShowPrivilege } },
      },
      docLinks: { links: { agentBuilder: { models: 'https://docs.example/models' } } },
      workflowsManagement: {
        agentBuilder: mockHasAgentBuilder
          ? {
              getAgentBuilderAccess: mockGetAgentBuilderAccess,
              EmbeddableConversationInput: ({ placeholder }: { placeholder?: string }) => (
                <div data-test-subj="mockConversationInput">{placeholder}</div>
              ),
            }
          : undefined,
      },
    },
  }),
}));

let mockCanCreateWorkflow = true;
let mockLibraryEnabled = false;
let mockActiveSolution: string | undefined;
let mockTemplates: Array<Record<string, unknown>> = [];

jest.mock('@kbn/workflows-ui', () => ({
  ...jest.requireActual('@kbn/workflows-ui'),
  useLibraryEnabled: () => mockLibraryEnabled,
  useWorkflowsCapabilities: () => ({ canCreateWorkflow: mockCanCreateWorkflow }),
  useActiveSolution: () => mockActiveSolution,
  useCatalog: () => ({ templates: mockTemplates }),
}));

const makeTemplate = (slug: string, categories: string[] = [], solutions?: string[]) => ({
  slug,
  name: `Template ${slug}`,
  description: '',
  stepTypes: [],
  triggerTypes: [],
  categories,
  solutions,
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
    window.sessionStorage.setItem('workflows.prototypeScenario', 'live');
    mockHasShowPrivilege = true;
    mockHasAgentBuilder = true;
    mockCanCreateWorkflow = true;
    mockLibraryEnabled = false;
    mockActiveSolution = undefined;
    mockTemplates = [];
  });

  const expectNoPrompt = () => {
    expect(screen.queryByTestId('agenticFirstAgentInput')).not.toBeInTheDocument();
    expect(screen.queryByTestId('agenticFirstConnectLlmPanel')).not.toBeInTheDocument();
    expect(screen.getByTestId('agenticFirstStartManuallyButton')).toBeInTheDocument();
  };

  it('uses the workflow prompt placeholder when the LLM-enabled empty state is shown', () => {
    window.sessionStorage.setItem('workflows.prototypeScenario', 'empty-workflow-llm-enabled');

    renderLive();

    expect(screen.getByTestId('mockConversationInput')).toHaveTextContent(
      'Describe the workflow you want to create: what should trigger it and what happens next'
    );
    expect(screen.queryByTestId('agenticFirstAutoMigrationPanel')).not.toBeInTheDocument();
  });

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
    expect(screen.queryByTestId('agenticFirstAutoMigrationPanel')).not.toBeInTheDocument();
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

  it('offers auto migration only on the auto migration empty state', () => {
    window.sessionStorage.setItem('workflows.prototypeScenario', 'empty-workflow-auto-migration');

    renderLive();

    const panel = screen.getByTestId('agenticFirstAutoMigrationPanel');
    const button = screen.getByTestId('agenticFirstAutoMigrationButton');
    expect(panel).toHaveTextContent('Coming from another tool?');
    expect(panel).toHaveTextContent('Bring your existing automations into Workflows.');
    expect(button).toHaveAttribute('href', AUTO_MIGRATION_HREF);
    expect(button).toHaveAttribute('target', '_blank');
    expect(button).not.toBeDisabled();
    expect(screen.queryByTestId('agenticFirstConnectLlmPanel')).not.toBeInTheDocument();
    expect(screen.getByTestId('mockConversationInput')).toHaveTextContent(
      'Describe the workflow you want to create: what should trigger it and what happens next'
    );
    expect(screen.getByTestId('agenticFirstAgentInput').compareDocumentPosition(panel)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
  });

  it('disables auto migration when the user cannot create workflows', () => {
    mockCanCreateWorkflow = false;
    window.sessionStorage.setItem('workflows.prototypeScenario', 'empty-workflow-auto-migration');

    renderLive();

    const button = screen.getByTestId('agenticFirstAutoMigrationButton');
    expect(button).toBeDisabled();
    expect(button).not.toHaveAttribute('href');
  });

  it('links category tiles to the filtered library and skips an empty category', async () => {
    mockGetAgentBuilderAccess.mockResolvedValue({
      hasRequiredLicense: true,
      hasLlmConnector: true,
    });
    mockLibraryEnabled = true;
    mockActiveSolution = 'security';
    mockTemplates = [
      makeTemplate('cases', ['case-management', 'ai-agent'], ['security']),
      makeTemplate('cases-two', ['case-management', 'ai-agent', 'hunting'], ['security']),
      makeTemplate('cases-three', ['case-management', 'notification'], ['security']),
      makeTemplate('intel', ['threat-intel'], ['security']),
      makeTemplate('prom', ['monitoring'], ['observability']),
    ];

    renderLive();
    await waitFor(() => expect(mockGetAgentBuilderAccess).toHaveBeenCalled());

    const caseTile = screen.getByTestId('workflowCategoryTile-case-management');
    expect(within(caseTile).getByRole('link', { name: /Case Management/ })).toHaveAttribute(
      'href',
      '/app/workflows/library?category=case-management'
    );
    expect(screen.getByTestId('workflowCategoryTileIcon-case-management')).toBeInTheDocument();
    expect(screen.getByTestId('workflowCategoryTileIcon-threat-intel')).toBeInTheDocument();
    expect(screen.getByTestId('workflowCategoryTileCount-case-management')).toHaveTextContent('3');
    expect(caseTile).toHaveTextContent('case-management');
    expect(caseTile).toHaveTextContent('ai-agent');
    expect(caseTile).toHaveTextContent('+2');
    expect(screen.getByText('Start automating from an existing template')).toBeInTheDocument();
    expect(caseTile).toHaveTextContent('Browse templates for opening and updating cases.');
    expect(screen.getByTestId('workflowCategoryTile-threat-intel')).toBeInTheDocument();
    expect(screen.queryByTestId('workflowCategoryTile-response')).not.toBeInTheDocument();
    expect(screen.queryByTestId('workflowCategoryTile-monitoring')).not.toBeInTheDocument();
    expect(screen.queryByText('Template prom')).not.toBeInTheDocument();
  });
});
