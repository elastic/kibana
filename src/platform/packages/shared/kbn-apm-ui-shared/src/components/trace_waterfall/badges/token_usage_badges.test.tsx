/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render } from '@testing-library/react';
import React from 'react';
import { TokenUsageBadges } from './token_usage_badges';

describe('TokenUsageBadges', () => {
  it('renders both badges when input and output tokens are present', () => {
    const { getByTestId, getByText } = render(
      <TokenUsageBadges inputTokens={19} outputTokens={58} />
    );

    expect(getByTestId('apmBarDetailsInputTokensBadge')).toBeInTheDocument();
    expect(getByTestId('apmBarDetailsOutputTokensBadge')).toBeInTheDocument();
    expect(getByText('input.tokens: 19')).toBeInTheDocument();
    expect(getByText('output.tokens: 58')).toBeInTheDocument();
  });

  it('formats large token counts with thousands separators', () => {
    const { getByText } = render(<TokenUsageBadges inputTokens={1840} outputTokens={128000} />);

    expect(getByText('input.tokens: 1,840')).toBeInTheDocument();
    expect(getByText('output.tokens: 128,000')).toBeInTheDocument();
  });

  it('renders only the input tokens badge when output tokens are missing', () => {
    const { getByTestId, queryByTestId } = render(<TokenUsageBadges inputTokens={19} />);

    expect(getByTestId('apmBarDetailsInputTokensBadge')).toBeInTheDocument();
    expect(queryByTestId('apmBarDetailsOutputTokensBadge')).not.toBeInTheDocument();
  });

  it('renders only the output tokens badge when input tokens are missing', () => {
    const { getByTestId, queryByTestId } = render(<TokenUsageBadges outputTokens={58} />);

    expect(queryByTestId('apmBarDetailsInputTokensBadge')).not.toBeInTheDocument();
    expect(getByTestId('apmBarDetailsOutputTokensBadge')).toBeInTheDocument();
  });

  it('renders nothing when both token values are missing', () => {
    const { container } = render(<TokenUsageBadges />);
    expect(container).toBeEmptyDOMElement();
  });
});
