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
import { TokenUsageBreakdown } from './token_usage_breakdown';

const renderBreakdown = (props: React.ComponentProps<typeof TokenUsageBreakdown>) =>
  render(
    <EuiProvider>
      <I18nProvider>
        <TokenUsageBreakdown {...props} />
      </I18nProvider>
    </EuiProvider>
  );

describe('TokenUsageBreakdown', () => {
  it('renders swatches and a two-segment bar with a square joint for split usage', () => {
    renderBreakdown({
      usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
    });

    expect(screen.getByTestId('workflowTokenUsageBreakdown-heading')).toHaveTextContent(
      'Token usage'
    );
    expect(screen.getByTestId('workflowTokenUsageBreakdown-inputRow')).toHaveTextContent(
      /100 tokens \(67%\)/
    );
    expect(screen.getByTestId('workflowTokenUsageBreakdown-outputRow')).toHaveTextContent(
      /50 tokens \(33%\)/
    );
    expect(screen.getByTestId('workflowTokenUsageBreakdown-totalRow')).toHaveTextContent(
      /150 tokens/
    );
    expect(screen.getByTestId('workflowTokenUsageBreakdown-inputSwatch')).toBeInTheDocument();
    expect(screen.getByTestId('workflowTokenUsageBreakdown-outputSwatch')).toBeInTheDocument();

    const bar = screen.getByTestId('workflowTokenUsageBreakdown-compositionBar');
    expect(bar).toBeInTheDocument();
    expect(bar).toHaveStyle({ overflow: 'hidden' });
    expect(bar.children).toHaveLength(2);
  });

  it('renders only the Total row with no bar or swatches when only a total exists', () => {
    renderBreakdown({
      usage: { inputTokens: 0, outputTokens: 0, totalTokens: 42 },
    });

    expect(screen.getByTestId('workflowTokenUsageBreakdown-totalRow')).toHaveTextContent(
      /42 tokens/
    );
    expect(screen.queryByTestId('workflowTokenUsageBreakdown-inputRow')).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('workflowTokenUsageBreakdown-compositionBar')
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId('workflowTokenUsageBreakdown-inputSwatch')).not.toBeInTheDocument();
  });

  it('renders parent context as model calls and never a model name', () => {
    renderBreakdown({
      usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
      callCount: 3,
      model: 'gpt-4.1',
      connectorName: 'OpenAI',
    });

    const footer = screen.getByTestId('workflowTokenUsageBreakdown-footer');
    expect(footer).toHaveTextContent('3 model calls');
    expect(footer).not.toHaveTextContent('gpt-4.1');
    expect(footer).not.toHaveTextContent('OpenAI');
  });

  it('renders leaf context as model · connector when callCount is not a parent rollup', () => {
    renderBreakdown({
      usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
      model: 'gpt-4.1',
      connectorName: 'OpenAI',
    });

    expect(screen.getByTestId('workflowTokenUsageBreakdown-footer')).toHaveTextContent(
      'gpt-4.1 · OpenAI'
    );
  });
});
