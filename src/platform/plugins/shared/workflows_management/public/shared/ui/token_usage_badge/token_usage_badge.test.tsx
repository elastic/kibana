/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiProvider } from '@elastic/eui';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { TokenUsageBadge } from './token_usage_badge';

const renderWithProviders = (ui: React.ReactNode) =>
  render(
    <EuiProvider>
      <I18nProvider>{ui}</I18nProvider>
    </EuiProvider>
  );

describe('TokenUsageBadge', () => {
  it('renders the total token count', () => {
    renderWithProviders(
      <TokenUsageBadge usage={{ inputTokens: 100, outputTokens: 50, totalTokens: 150 }} />
    );

    expect(screen.getByTestId('workflowTokenUsageBadge')).toHaveTextContent('150 tokens');
  });

  it('renders nothing when no usage is provided', () => {
    const { container } = renderWithProviders(<TokenUsageBadge usage={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when total token count is zero', () => {
    const { container } = renderWithProviders(
      <TokenUsageBadge usage={{ inputTokens: 0, outputTokens: 0, totalTokens: 0 }} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders compact notation for large totals', () => {
    renderWithProviders(
      <TokenUsageBadge usage={{ inputTokens: 9000, outputTokens: 3500, totalTokens: 12500 }} />
    );

    expect(screen.getByTestId('workflowTokenUsageBadge')).toHaveTextContent('12.5K tokens');
  });

  it('drops the " tokens" suffix in compact mode', () => {
    renderWithProviders(
      <TokenUsageBadge
        usage={{ inputTokens: 9000, outputTokens: 3500, totalTokens: 12500 }}
        compact
      />
    );

    const badge = screen.getByTestId('workflowTokenUsageBadge');
    expect(badge).toHaveTextContent('12.5K');
    expect(badge).not.toHaveTextContent('tokens');
  });

  it('opens the shared TokenUsageBreakdown in the popover on focus', () => {
    renderWithProviders(
      <TokenUsageBadge usage={{ inputTokens: 100, outputTokens: 50, totalTokens: 150 }} />
    );

    fireEvent.focus(screen.getByTestId('workflowTokenUsageBadge'));
    expect(screen.getByTestId('workflowTokenUsageBadge-popover')).toBeInTheDocument();
    expect(screen.getByTestId('workflowTokenUsageBreakdown')).toBeInTheDocument();
    expect(screen.getByTestId('workflowTokenUsageBreakdown-heading')).toHaveTextContent(
      'Token usage'
    );
  });
});
