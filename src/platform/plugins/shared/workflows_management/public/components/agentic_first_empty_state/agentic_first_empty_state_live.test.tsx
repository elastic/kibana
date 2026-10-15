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
import { AgenticFirstEmptyStateLive } from './agentic_first_empty_state_live';

const mockNavigateToApp = jest.fn();
const mockGetAgentBuilderAccess = jest.fn();

jest.mock('../../hooks/use_kibana', () => ({
  useKibana: () => ({
    services: {
      application: { navigateToApp: mockNavigateToApp },
      docLinks: { links: { agentBuilder: { models: 'https://docs.example/models' } } },
      workflowsManagement: {
        agentBuilder: {
          getAgentBuilderAccess: mockGetAgentBuilderAccess,
          EmbeddableConversationInput: () => <div data-test-subj="mockConversationInput" />,
        },
      },
    },
  }),
}));

jest.mock('@kbn/workflows-ui', () => ({
  ...jest.requireActual('@kbn/workflows-ui'),
  useLibraryEnabled: () => false,
  useCatalog: () => ({ templates: [] }),
}));

const renderLive = () =>
  render(
    <I18nProvider>
      <AgenticFirstEmptyStateLive />
    </I18nProvider>
  );

describe('AgenticFirstEmptyStateLive', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  it('keeps the chat input when the license is missing', async () => {
    mockGetAgentBuilderAccess.mockResolvedValue({
      hasRequiredLicense: false,
      hasLlmConnector: false,
    });

    renderLive();

    await waitFor(() => expect(mockGetAgentBuilderAccess).toHaveBeenCalled());
    expect(screen.getByTestId('mockConversationInput')).toBeInTheDocument();
    expect(screen.queryByTestId('agenticFirstConnectLlmPanel')).not.toBeInTheDocument();
  });
});
