/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiProvider } from '@elastic/eui';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { AiStepSection } from './ai_step_section';

jest.mock('../../../hooks/use_kibana', () => ({
  useKibana: () => ({
    services: {
      application: {
        getUrlForApp: (_app: string, { path }: { path: string }) => `/app/management${path}`,
      },
    },
  }),
}));

const renderSection = (
  ai: React.ComponentProps<typeof AiStepSection>['ai'],
  connectorName?: string
) =>
  render(
    <EuiProvider>
      <I18nProvider>
        <AiStepSection ai={ai} connectorName={connectorName} />
      </I18nProvider>
    </EuiProvider>
  );

describe('AiStepSection', () => {
  it('renders model, connector, TTFT, and the shared TokenUsageBreakdown', () => {
    renderSection(
      {
        model: 'gpt-4.1',
        connectorId: 'conn-1',
        timeToFirstTokenMs: 120,
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
      },
      'Flyout Demo OpenAI'
    );

    expect(screen.getByTestId('workflowExecutionAiSectionModel')).toHaveTextContent('gpt-4.1');
    expect(screen.getByTestId('workflowExecutionAiSectionConnector')).toHaveTextContent(
      'Flyout Demo OpenAI'
    );
    expect(screen.getByTestId('workflowExecutionAiSectionTtft')).toHaveTextContent('120 ms');
    expect(screen.getByTestId('workflowExecutionAiSectionTokenUsage')).toBeInTheDocument();
    expect(screen.getByTestId('workflowTokenUsageBreakdown')).toBeInTheDocument();
    expect(screen.getByTestId('workflowTokenUsageBreakdown-inputRow')).toHaveTextContent(
      /100 tokens \(67%\)/
    );
    expect(screen.getByTestId('workflowTokenUsageBreakdown-compositionBar')).toBeInTheDocument();
  });

  it('renders only the Total row with no bar when only a total exists', () => {
    renderSection({ totalTokens: 42 });

    expect(screen.getByTestId('workflowTokenUsageBreakdown-totalRow')).toHaveTextContent(
      /42 tokens/
    );
    expect(
      screen.queryByTestId('workflowTokenUsageBreakdown-compositionBar')
    ).not.toBeInTheDocument();
  });

  it('renders Model without a Token usage block when no token fields exist', () => {
    renderSection({ model: 'gpt-4o' });

    expect(screen.getByTestId('workflowExecutionAiSectionModel')).toHaveTextContent('gpt-4o');
    expect(screen.queryByLabelText('Copy model')).not.toBeInTheDocument();
    expect(screen.queryByTestId('workflowTokenUsageBreakdown')).not.toBeInTheDocument();
  });

  it('renders Connector from props without a Model row when model is absent', () => {
    renderSection({ connectorId: 'conn-1', totalTokens: 10 }, 'Flyout Demo OpenAI');

    expect(screen.queryByTestId('workflowExecutionAiSectionModel')).not.toBeInTheDocument();
    expect(screen.getByTestId('workflowExecutionAiSectionConnector')).toHaveTextContent(
      'Flyout Demo OpenAI'
    );
    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      expect.stringContaining('/connectors/conn-1')
    );
  });
});
