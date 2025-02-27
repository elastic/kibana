/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import type { CoreStart } from '@kbn/core/public';
import { AiAssistantSelectionPage } from './ai_assistant_selection_page';
import { useAppContext } from '../../app_context';
import { I18nProvider } from '@kbn/i18n-react';

jest.mock('../../app_context');

describe('AiAssistantSelectionPage', () => {
  const setBreadcrumbs = jest.fn();
  const navigateToApp = jest.fn();

  const generateMockCapabilities = (hasPermission: boolean) =>
    ({
      observabilityAIAssistant: { show: hasPermission },
      securitySolutionAssistant: { 'ai-assistant': hasPermission },
    } as unknown as CoreStart['application']['capabilities']);

  const testCapabilities = generateMockCapabilities(true);

  const renderComponent = (capabilities: CoreStart['application']['capabilities']) => {
    (useAppContext as jest.Mock).mockReturnValue({
      capabilities,
      setBreadcrumbs,
      navigateToApp,
      kibanaBranch: 'main',
      buildFlavor: 'ess',
    });
    render(<AiAssistantSelectionPage />, {
      wrapper: I18nProvider,
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sets the breadcrumbs on mount', () => {
    renderComponent(testCapabilities);
    expect(setBreadcrumbs).toHaveBeenCalledWith([
      {
        text: 'AI Assistant',
      },
    ]);
  });

  it('renders the title and description', () => {
    renderComponent(generateMockCapabilities(true));
    expect(screen.getByTestId('pluginsAiAssistantSelectionPageTitle')).toBeInTheDocument();
    expect(screen.getByTestId('pluginsAiAssistantSelectionPageDescription')).toBeInTheDocument();
  });

  describe('Observability AI Assistant Card', () => {
    describe('when the feature is disabled', () => {
      it('displays the disabled callout', () => {
        renderComponent(generateMockCapabilities(false));
        expect(
          screen.getByTestId('pluginsAiAssistantSelectionPageObservabilityDocumentationCallout')
        ).toBeInTheDocument();
      });
    });

    describe('when the feature is enabled', () => {
      it('does not display the disabled callout', () => {
        renderComponent(testCapabilities);
        expect(
          screen.queryByTestId('pluginsAiAssistantSelectionPageObservabilityDocumentationCallout')
        ).not.toBeInTheDocument();
      });

      it('renders the manage settings button', () => {
        renderComponent(testCapabilities);
        expect(screen.getByTestId('pluginsAiAssistantSelectionPageButton')).toBeInTheDocument();
      });

      it('navigates to the observability AI Assistant settings on button click', () => {
        renderComponent(testCapabilities);
        fireEvent.click(screen.getByTestId('pluginsAiAssistantSelectionPageButton'));
        expect(navigateToApp).toHaveBeenCalledWith('management', {
          path: 'kibana/observabilityAiAssistantManagement',
        });
      });

      it('renders the documentation links correctly', () => {
        renderComponent(testCapabilities);

        expect(
          screen.getByTestId('pluginsAiAssistantSelectionPageDocumentationLink')
        ).toHaveAttribute(
          'href',
          'https://www.elastic.co/guide/en/observability/current/obs-ai-assistant.html'
        );
      });
    });
  });

  describe('Security AI Assistant Card', () => {
    describe('when the feature is disabled', () => {
      it('displays the disabled callout', () => {
        renderComponent(generateMockCapabilities(false));
        expect(
          screen.getByTestId('pluginsAiAssistantSelectionPageSecurityDocumentationCallout')
        ).toBeInTheDocument();
      });
    });

    describe('when the feature is enabled', () => {
      it('does not display the disabled callout', () => {
        renderComponent(testCapabilities);
        expect(
          screen.queryByTestId('pluginsAiAssistantSelectionPageSecurityDocumentationCallout')
        ).not.toBeInTheDocument();
      });

      it('renders the manage settings button', () => {
        renderComponent(testCapabilities);
        expect(
          screen.getByTestId('pluginsAiAssistantSelectionSecurityPageButton')
        ).toBeInTheDocument();
      });

      it('navigates to the security AI Assistant settings on button click', () => {
        renderComponent(testCapabilities);
        fireEvent.click(screen.getByTestId('pluginsAiAssistantSelectionSecurityPageButton'));
        expect(navigateToApp).toHaveBeenCalledWith('management', {
          path: 'kibana/securityAiAssistantManagement',
        });
      });

      it('renders the documentation links correctly', () => {
        renderComponent(testCapabilities);

        expect(
          screen.getByTestId('securityAiAssistantSelectionPageDocumentationLink')
        ).toHaveAttribute(
          'href',
          'https://www.elastic.co/guide/en/security/current/security-assistant.html'
        );
      });
    });
  });
});
